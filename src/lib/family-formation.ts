import ExcelJS from "exceljs";

const FAMILY_HEADERS = new Set(["가족", "가족이름", "가족명"]);
const NAME_HEADERS = new Set(["이름", "성명"]);

const MAX_PEOPLE = 500;
const HEADER_SCAN_ROWS = 8;

export type FormationPerson = {
  row: number;
  familyName: string;
  name: string;
};

export type FormationFamily = {
  name: string;
  members: FormationPerson[];
};

type SheetLine = { row: number; cells: string[] };

export type FormationRoster = {
  members: { name: string; userId: string | null }[];
  groups: { name: string; currentLeaderId: string | null }[];
};

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("").trim();
  }
  return "";
}

function joinErrors(errors: string[]): string {
  const shown = errors.slice(0, 8);
  const rest = errors.length - shown.length;
  return rest > 0 ? `${shown.join(" ")} 외 ${rest}건이 더 있습니다.` : shown.join(" ");
}

function headerIndex(cells: string[], names: Set<string>): number {
  return cells.findIndex((cell) => names.has(cell.replace(/\s/g, "").toLowerCase()) || names.has(cell.replace(/\s/g, "")));
}

/** 첫 시트(또는 이름이 가족편성인 시트)의 칸을 가족 단위로 읽는다. */
export function parseFamilyFormationLines(lines: SheetLine[]): { ok: true; families: FormationFamily[] } | { ok: false; error: string } {
  const headerLine = lines.slice(0, HEADER_SCAN_ROWS).find((line) => {
    return headerIndex(line.cells, FAMILY_HEADERS) >= 0 && headerIndex(line.cells, NAME_HEADERS) >= 0;
  });
  if (!headerLine) {
    return { ok: false, error: "첫 줄에 가족명, 이름 칸이 있어야 합니다. 가족편성 양식을 받아 그 칸 그대로 써 주세요." };
  }

  const familyCol = headerIndex(headerLine.cells, FAMILY_HEADERS);
  const nameCol = headerIndex(headerLine.cells, NAME_HEADERS);
  const errors: string[] = [];
  const people: FormationPerson[] = [];

  for (const line of lines) {
    if (line.row <= headerLine.row) continue;
    const familyName = (line.cells[familyCol] ?? "").trim();
    const name = (line.cells[nameCol] ?? "").trim();
    if (!familyName && !name) continue;
    if (!familyName || !name) {
      errors.push(`${line.row}행에 가족명과 이름이 모두 있어야 합니다.`);
      continue;
    }
    people.push({ row: line.row, familyName, name });
  }

  if (people.length > MAX_PEOPLE) {
    errors.push(`한 번에 ${MAX_PEOPLE}명까지 올릴 수 있습니다.`);
  }

  const seenNames = new Map<string, number>();
  for (const person of people) {
    const previous = seenNames.get(person.name);
    if (previous != null) {
      errors.push(`${person.name} 님이 ${previous}행과 ${person.row}행에 두 번 나옵니다.`);
    } else {
      seenNames.set(person.name, person.row);
    }
  }

  const byFamily = new Map<string, FormationPerson[]>();
  for (const person of people) {
    const list = byFamily.get(person.familyName) ?? [];
    list.push(person);
    byFamily.set(person.familyName, list);
  }

  const families: FormationFamily[] = [...byFamily.entries()].map(([name, members]) => ({ name, members }));

  if (errors.length > 0) return { ok: false, error: joinErrors(errors) };
  if (families.length === 0) return { ok: false, error: "올릴 가족이 없습니다." };
  return { ok: true, families };
}

/**
 * 가족은 가장을 정할 때 이미 생긴 이네 가족만 받는다.
 * 그 가장은 다른 가족으로 옮기지 않는다.
 * 명단에 같은 이름이 둘이면 누구인지 정하지 않는다.
 */
export function checkFormationAgainstRoster(families: FormationFamily[], roster: FormationRoster): string | null {
  const errors: string[] = [];
  const groupNames = new Map<string, number>();
  for (const group of roster.groups) {
    groupNames.set(group.name, (groupNames.get(group.name) ?? 0) + 1);
  }
  for (const [name, count] of groupNames) {
    if (count > 1) errors.push(`${name} 가족이 이번 학기에 ${count}개라 어느 쪽인지 알 수 없습니다.`);
  }
  for (const family of families) {
    if (!groupNames.has(family.name)) {
      errors.push(`${family.name} 가족이 이번 학기에 없습니다. 가장을 먼저 정해 주세요.`);
    }
  }

  const membersByName = new Map<string, { userId: string | null }[]>();
  for (const member of roster.members) {
    const key = member.name.trim();
    const list = membersByName.get(key) ?? [];
    list.push(member);
    membersByName.set(key, list);
  }

  const leaderFamilyByUserId = new Map<string, string>();
  for (const group of roster.groups) {
    if (group.currentLeaderId) leaderFamilyByUserId.set(group.currentLeaderId, group.name);
  }

  for (const family of families) {
    for (const person of family.members) {
      const matches = membersByName.get(person.name) ?? [];
      if (matches.length > 1) {
        errors.push(`${person.name} 님이 성도 명단에 둘이라 누구인지 알 수 없습니다.`);
        continue;
      }
      const userId = matches[0]?.userId;
      if (!userId) continue;
      const leading = leaderFamilyByUserId.get(userId);
      if (leading && leading !== family.name) {
        errors.push(`${person.name} 님은 이번 학기 ${leading} 가장이라 다른 가족으로 옮길 수 없습니다.`);
      }
    }
  }

  return errors.length > 0 ? joinErrors(errors) : null;
}

export function googleSheetExportUrl(input: string): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, error: "구글 시트 주소가 아닙니다." };
  }
  if (url.protocol !== "https:" || url.hostname !== "docs.google.com") {
    return { ok: false, error: "구글 시트 공유 주소만 읽을 수 있습니다." };
  }
  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return { ok: false, error: "구글 시트 공유 주소만 읽을 수 있습니다." };
  return { ok: true, url: `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx` };
}

export function describeFormationResult(counts: {
  membersCreated: number;
  membersMoved: number;
}): string {
  const sentences: string[] = [];
  if (counts.membersCreated > 0) sentences.push(`가족원 ${counts.membersCreated}명을 명단에 넣었습니다.`);
  if (counts.membersMoved > 0) sentences.push(`${counts.membersMoved}명을 이번 가족으로 옮겼습니다.`);
  if (sentences.length === 0) return "표와 같은 편성이 이미 되어 있습니다.";
  return sentences.join(" ");
}

export function formationLooksLikeWorkbook(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function matrixFromSheet(sheet: ExcelJS.Worksheet): Promise<SheetLine[]> {
  const lines: SheetLine[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    const last = Math.max(row.cellCount, 4);
    for (let index = 1; index <= last; index += 1) cells.push(cellText(row.getCell(index).value));
    if (cells.some((cell) => cell.length > 0)) lines.push({ row: row.number, cells });
  });
  return lines;
}

export async function parseFamilyFormationWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet("가족편성") ?? workbook.worksheets[0];
  if (!sheet) return { ok: false as const, error: "시트가 없습니다." };
  return parseFamilyFormationLines(await matrixFromSheet(sheet));
}

/** 임원·목사가 받아 채우는 가족편성 양식. 예시 이름은 안내 시트에만 둔다. */
export async function buildFamilyFormationTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "2청년회";

  const sheet = workbook.addWorksheet("가족편성", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "가족명", key: "family", width: 18 },
    { header: "이름", key: "name", width: 16 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E5E4" } };
  header.alignment = { vertical: "middle" };
  sheet.getCell("A1").note = "가장을 정할 때 생긴 이네 가족 이름을 적고, 그 가족에 넣을 사람을 한 줄에 한 명씩 적습니다.";

  const help = workbook.addWorksheet("안내");
  help.getColumn(1).width = 88;
  const helpLines = [
    "반기 가족편성 양식",
    "",
    "가장을 먼저 정하면 그 가장을 대표하는 이네 가족이 생깁니다. 이 표는 그 가족에 사람을 넣는 표입니다.",
    "가족편성 시트에 가족명과 이름만, 한 줄에 한 명씩 적습니다.",
    "이번 학기에 없는 가족명은 올리지 못합니다. 가장을 먼저 정해 주세요.",
    "이미 성도 명단에 있는 이름은 새로 만들지 않고 그 가족으로 옮깁니다.",
    "이번 학기 가장은 다른 가족으로 옮기지 않습니다.",
    "구글 시트로 쓸 때는 칸 이름을 가족명, 이름으로 맞추고, 링크가 있는 누구나 볼 수 있게 공유합니다.",
    "",
    "예시 (이 시트는 읽지 않습니다)",
    "가족명 | 이름",
    "민석이네 | 홍길동",
    "민석이네 | 홍길순",
  ];
  helpLines.forEach((line, index) => {
    const row = help.getRow(index + 1);
    row.getCell(1).value = line;
    row.getCell(1).alignment = { wrapText: true };
    if (index === 0) row.font = { bold: true };
  });

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}
