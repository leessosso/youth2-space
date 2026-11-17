import { canManageApp, isMeetingAttendee, type User } from "@/lib/types";

/** 월례회 순서. 담당 직책은 해마다 같고, 이름은 달마다 고친다. */
export const MONTHLY_AGENDA = [
  { title: "기도", role: "부회장" },
  { title: "회원호명", role: "서기" },
  { title: "전월 회의록", role: "서기" },
  { title: "팀 사역보고", role: "각 팀 팀장" },
  { title: "사업보고", role: "부총무" },
  { title: "회계보고", role: "부회계" },
  { title: "안건토의", role: "부회장" },
  { title: "기타토의", role: "부회장" },
  { title: "회의록 채택", role: "서기" },
  { title: "광고", role: "부총무" },
  { title: "기도", role: "가장" },
] as const;

export const MONTHLY_TEAMS = [
  { key: "new_family", name: "새가족팀" },
  { key: "onsemiro", name: "온세미로" },
  { key: "coramdeo", name: "코람데오" },
  { key: "heim", name: "하임워십" },
] as const;

export type MonthlyTeamKey = (typeof MONTHLY_TEAMS)[number]["key"];

export const DEFAULT_VERSE = "하나님의 뜻대로 말씀을 듣고 행하라(마 7:21)";

export type AssemblyStatus = "draft" | "published";

export type HeadcountPoint = {
  label: string;
  dept4: number | null;
  dept13: number | null;
};

export type WorshipRow = {
  date: string;
  sermon: string;
  liturgy: string;
  worshipPrayer: string;
  repPrayer: string;
  offeringPrayer: string;
  offeringCommittee: string;
  mealService: string;
};

/** 예배 순서에서 사람을 적는 칸. 날짜는 여기 넣지 않는다. */
export const WORSHIP_PERSON_FIELDS = [
  { key: "sermon", label: "설교" },
  { key: "liturgy", label: "예배안내/윗정리" },
  { key: "worshipPrayer", label: "예배를 위한 기도회" },
  { key: "repPrayer", label: "대표기도" },
  { key: "offeringPrayer", label: "헌금기도" },
  { key: "offeringCommittee", label: "헌금위원" },
  { key: "mealService", label: "식당봉사" },
] as const satisfies readonly { key: keyof WorshipRow; label: string }[];

export type CountRow = { label: string; count: string };

export type TeamSection = {
  teamKey: MonthlyTeamKey;
  teamName: string;
  editorUserId: string | null;
  lastMonth: string;
  thisMonth: string;
  /** 코람데오 기도회 인원. 다른 팀은 null. */
  coramdeoRows: CountRow[] | null;
};

/** 사업보고. 팀 사역보고와 같이 지난달 내용과 이번달 계획만 적는다. */
export type BusinessReport = {
  lastMonth: string;
  thisMonth: string;
};

export type CalendarRow = {
  saturday: string;
  saturdayEvent: string;
  sunday: string;
  sundayEvent: string;
};

export type MonthlyAssembly = {
  id: string;
  year: number;
  month: number;
  status: AssemblyStatus;
  verse: string;
  heldAt: string;
  place: string;
  goalYouth: number;
  goalCoramdeo: number;
  agendaOwners: string[];
  annual: HeadcountPoint[];
  previousWeeks: HeadcountPoint[];
  worship: WorshipRow[];
  teams: TeamSection[];
  business: BusinessReport;
  finance: string;
  safety: string;
  other: string;
  minutes: string;
  announcements: string;
  calendar: CalendarRow[];
  calendarNote: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type SundayHeadcount = {
  dateKey: string;
  dept4: number;
  dept13: number;
};

type Viewer = Pick<User, "id" | "role" | "officerTitle">;

const ANNUAL_SLOTS = 12;
const WEEK_SLOTS = 5;
const WORSHIP_SLOTS = 5;
const CALENDAR_SLOTS = 5;
const CORAM_SLOTS = 6;

export function assemblyId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function assemblyTitle(assembly: Pick<MonthlyAssembly, "year" | "month">): string {
  return `${assembly.year}년 ${assembly.month}월 월례회`;
}

function emptyWorship(): WorshipRow {
  return {
    date: "",
    sermon: "",
    liturgy: "",
    worshipPrayer: "",
    repPrayer: "",
    offeringPrayer: "",
    offeringCommittee: "",
    mealService: "",
  };
}

function emptyCalendar(): CalendarRow {
  return { saturday: "", saturdayEvent: "", sunday: "", sundayEvent: "" };
}

function emptyTeam(team: (typeof MONTHLY_TEAMS)[number]): TeamSection {
  return {
    teamKey: team.key,
    teamName: team.name,
    editorUserId: null,
    lastMonth: "",
    thisMonth: "",
    coramdeoRows:
      team.key === "coramdeo"
        ? Array.from({ length: CORAM_SLOTS }, () => ({ label: "", count: "" }))
        : null,
  };
}

export function blankAssembly(year: number, month: number, now = new Date().toISOString()): MonthlyAssembly {
  return {
    id: assemblyId(year, month),
    year,
    month,
    status: "draft",
    verse: DEFAULT_VERSE,
    heldAt: "",
    place: "",
    goalYouth: 250,
    goalCoramdeo: 50,
    agendaOwners: MONTHLY_AGENDA.map((item) => item.role),
    annual: Array.from({ length: ANNUAL_SLOTS }, () => ({ label: "", dept4: null, dept13: null })),
    previousWeeks: Array.from({ length: WEEK_SLOTS }, () => ({ label: "", dept4: null, dept13: null })),
    worship: Array.from({ length: WORSHIP_SLOTS }, emptyWorship),
    teams: MONTHLY_TEAMS.map(emptyTeam),
    business: { lastMonth: "", thisMonth: "" },
    finance: "",
    safety: "",
    other: "",
    minutes: "",
    announcements: "",
    calendar: Array.from({ length: CALENDAR_SLOTS }, emptyCalendar),
    calendarNote: "",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asPoint(value: unknown): HeadcountPoint {
  const row = value && typeof value === "object" ? (value as Partial<HeadcountPoint>) : {};
  return { label: text(row.label), dept4: nullableCount(row.dept4), dept13: nullableCount(row.dept13) };
}

/** 예전 새가족 칸(등록·출석·등반·수료)을 지난달 사역 글로 붙인다. */
function foldLegacyNewFamily(lastMonth: string, family: unknown): string {
  if (!family || typeof family !== "object") return lastMonth;
  const row = family as Record<string, unknown>;
  const lines = [
    text(row.registered) && `등록: ${text(row.registered)}`,
    text(row.attended) && `출석: ${text(row.attended)}`,
    text(row.promoted) && `등반: ${text(row.promoted)}`,
    text(row.completed) && `수료: ${text(row.completed)}`,
    text(row.quarter) && `분기 평균: ${text(row.quarter)}`,
    text(row.monthNote),
  ].filter(Boolean);
  const extra = lines.join("\n");
  if (!extra || lastMonth.includes(extra)) return lastMonth;
  return [extra, lastMonth].filter(Boolean).join("\n\n");
}

function asTeam(value: unknown, fallback: TeamSection): TeamSection {
  const row = value && typeof value === "object" ? (value as Partial<TeamSection> & { newFamily?: unknown }) : {};
  const rows = row.coramdeoRows;
  return {
    teamKey: fallback.teamKey,
    teamName: text(row.teamName) || fallback.teamName,
    editorUserId: typeof row.editorUserId === "string" && row.editorUserId ? row.editorUserId : null,
    lastMonth: foldLegacyNewFamily(text(row.lastMonth), row.newFamily),
    thisMonth: text(row.thisMonth),
    coramdeoRows:
      fallback.coramdeoRows == null
        ? null
        : pad(
            Array.isArray(rows)
              ? rows.map((item) => ({
                  label: text((item as CountRow).label),
                  count: text((item as CountRow).count),
                }))
              : [],
            CORAM_SLOTS,
            () => ({ label: "", count: "" }),
          ),
  };
}

function pad<T>(items: T[], size: number, make: () => T): T[] {
  const next = items.slice(0, size);
  while (next.length < size) next.push(make());
  return next;
}

function readBusiness(value: unknown): BusinessReport {
  if (typeof value === "string") return { lastMonth: value, thisMonth: "" };
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const row = item as Record<string, unknown>;
        const title = text(row.title);
        const detail = [
          text(row.date) && `일시: ${text(row.date)}`,
          text(row.place) && `장소: ${text(row.place)}`,
          text(row.people) && `인원: ${text(row.people)}`,
        ]
          .filter(Boolean)
          .join(" · ");
        return [title, detail, text(row.note)].filter(Boolean).join("\n");
      })
      .filter(Boolean);
    return { lastMonth: lines.join("\n\n"), thisMonth: "" };
  }
  if (value && typeof value === "object") {
    const row = value as Partial<BusinessReport>;
    return { lastMonth: text(row.lastMonth), thisMonth: text(row.thisMonth) };
  }
  return { lastMonth: "", thisMonth: "" };
}

/** 저장본에 칸이 빠져 있어도 화면과 폼이 같은 뼈대를 쓰게 맞춘다. */
export function normalizeAssembly(
  id: string,
  data: Omit<Partial<MonthlyAssembly>, "business"> & { business?: unknown },
): MonthlyAssembly {
  const [yearText, monthText] = id.split("-");
  const year = data.year ?? Number(yearText);
  const month = data.month ?? Number(monthText);
  const base = blankAssembly(year, month, data.createdAt ?? new Date().toISOString());
  const teamsByKey = new Map(
    (Array.isArray(data.teams) ? data.teams : []).map((team) => [team.teamKey, team]),
  );
  return {
    ...base,
    ...data,
    id,
    year,
    month,
    status: data.status === "published" ? "published" : "draft",
    verse: text(data.verse) || base.verse,
    heldAt: text(data.heldAt),
    place: text(data.place),
    goalYouth: nullableCount(data.goalYouth) ?? base.goalYouth,
    goalCoramdeo: nullableCount(data.goalCoramdeo) ?? base.goalCoramdeo,
    agendaOwners: pad(
      (data.agendaOwners ?? []).map((owner) => text(owner)),
      MONTHLY_AGENDA.length,
      () => "",
    ),
    annual: pad((data.annual ?? []).map(asPoint), ANNUAL_SLOTS, () => ({ label: "", dept4: null, dept13: null })),
    previousWeeks: pad((data.previousWeeks ?? []).map(asPoint), WEEK_SLOTS, () => ({
      label: "",
      dept4: null,
      dept13: null,
    })),
    worship: pad(
      (data.worship ?? []).map((row) => ({ ...emptyWorship(), ...row })),
      WORSHIP_SLOTS,
      emptyWorship,
    ),
    teams: base.teams.map((team) => asTeam(teamsByKey.get(team.teamKey), team)),
    business: readBusiness(data.business),
    finance: text(data.finance),
    safety: text(data.safety),
    other: text(data.other),
    minutes: text(data.minutes),
    announcements: text(data.announcements),
    calendar: pad((data.calendar ?? []).map((row) => ({ ...emptyCalendar(), ...row })), CALENDAR_SLOTS, emptyCalendar),
    calendarNote: text(data.calendarNote),
    createdAt: text(data.createdAt) || base.createdAt,
    updatedAt: text(data.updatedAt) || base.updatedAt,
    publishedAt: data.publishedAt ?? null,
  };
}

export function nextAssemblyFrom(
  prev: MonthlyAssembly,
  year: number,
  month: number,
  now = new Date().toISOString(),
): MonthlyAssembly {
  const next = blankAssembly(year, month, now);
  return {
    ...next,
    verse: prev.verse,
    place: prev.place,
    goalYouth: prev.goalYouth,
    goalCoramdeo: prev.goalCoramdeo,
    agendaOwners: [...prev.agendaOwners],
    annual: prev.annual.map((point) => ({ ...point })),
    business: {
      lastMonth: prev.business.thisMonth,
      thisMonth: "",
    },
    teams: prev.teams.map((team) => ({
      ...team,
      lastMonth: team.thisMonth,
      thisMonth: "",
      coramdeoRows: team.coramdeoRows
        ? team.coramdeoRows.map(() => ({ label: "", count: "" }))
        : null,
    })),
  };
}

export function canManageAssembly(user: Viewer): boolean {
  return canManageApp(user);
}

export function canViewAssembly(user: Viewer, assembly: MonthlyAssembly): boolean {
  if (isMeetingAttendee(user.role)) return false;
  if (assembly.status === "published") return true;
  if (canManageAssembly(user)) return true;
  return assembly.teams.some((team) => team.editorUserId === user.id);
}

export function editableTeamKeys(user: Viewer, assembly: MonthlyAssembly): MonthlyTeamKey[] {
  if (canManageAssembly(user)) return assembly.teams.map((team) => team.teamKey);
  if (assembly.status !== "draft") return [];
  return assembly.teams
    .filter((team) => team.editorUserId === user.id)
    .map((team) => team.teamKey);
}

export function visiblePoints(points: HeadcountPoint[]): HeadcountPoint[] {
  return points.filter((point) => point.label.trim() || point.dept4 != null || point.dept13 != null);
}

export function countPresent(status: string): boolean {
  return status === "present" || status === "broadcast";
}

export function weeklyHeadcount(
  marks: { s13: { status: string }; s4: { status: string } }[],
): { dept4: number; dept13: number } {
  let dept4 = 0;
  let dept13 = 0;
  for (const mark of marks) {
    if (countPresent(mark.s13.status)) dept13 += 1;
    if (countPresent(mark.s4.status)) dept4 += 1;
  }
  return { dept4, dept13 };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  if (month <= 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function weekPointsForMonth(
  counts: SundayHeadcount[],
  year: number,
  month: number,
): HeadcountPoint[] {
  const prefix = monthKey(year, month);
  return counts
    .filter((row) => row.dateKey.startsWith(prefix))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((row) => ({
      label: `${Number(row.dateKey.slice(8))}일`,
      dept4: row.dept4,
      dept13: row.dept13,
    }));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** 회의 달의 직전 달까지, 주별 인원이 있는 달만 연간 평균으로 쌓는다. */
export function annualPointsFromWeekly(
  counts: SundayHeadcount[],
  meetingYear: number,
  meetingMonth: number,
  months = 12,
): HeadcountPoint[] {
  const end = previousMonth(meetingYear, meetingMonth);
  const keys: { year: number; month: number }[] = [];
  let cursor = end;
  for (let i = 0; i < months; i += 1) {
    keys.unshift(cursor);
    cursor = previousMonth(cursor.year, cursor.month);
  }
  const points: HeadcountPoint[] = [];
  for (const key of keys) {
    const weeks = weekPointsForMonth(counts, key.year, key.month);
    if (weeks.length === 0) continue;
    points.push({
      label: `${String(key.year).slice(2)}년 ${key.month}월`,
      dept4: average(weeks.map((week) => week.dept4).filter((value): value is number => value != null)),
      dept13: average(weeks.map((week) => week.dept13).filter((value): value is number => value != null)),
    });
  }
  return points;
}

/** 저장된 `8/2`를 해당 월례회 해의 달력 값으로 바꾼다. 읽지 못하면 빈 칸. */
export function worshipDateToInput(stored: string, year: number): string {
  const trimmed = stored.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!isCalendarDate(year, month, day)) return "";
    return `${year}-${iso[2]}-${iso[3]}`;
  }
  const short = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/.exec(trimmed);
  if (!short) return "";
  const month = Number(short[1]);
  const day = Number(short[2]);
  if (!isCalendarDate(year, month, day)) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 달력 입력(`2026-08-02`)을 자료에 쓰는 `8/2`로 바꾼다. 이미 짧은 표기면 그대로 둔다. */
export function worshipDateFromInput(value: string): string {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!iso) return trimmed;
  const year = Number(iso[1]);
  const month = Number(iso[2]);
  const day = Number(iso[3]);
  if (!isCalendarDate(year, month, day)) return "";
  return `${month}/${day}`;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function field(fd: FormData, name: string): string {
  const value = fd.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function countField(fd: FormData, name: string): number | null {
  const raw = field(fd, name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function pointFromForm(fd: FormData, prefix: string, index: number): HeadcountPoint {
  return {
    label: field(fd, `${prefix}_${index}_label`),
    dept4: countField(fd, `${prefix}_${index}_dept4`),
    dept13: countField(fd, `${prefix}_${index}_dept13`),
  };
}

export function assemblyFromForm(current: MonthlyAssembly, fd: FormData, now = new Date().toISOString()): MonthlyAssembly {
  const business = {
    lastMonth: field(fd, "businessLast"),
    thisMonth: field(fd, "businessPlan"),
  };
  const worship = current.worship.map((_, index) => ({
    date: worshipDateFromInput(field(fd, `worship_${index}_date`)),
    sermon: field(fd, `worship_${index}_sermon`),
    liturgy: field(fd, `worship_${index}_liturgy`),
    worshipPrayer: field(fd, `worship_${index}_worshipPrayer`),
    repPrayer: field(fd, `worship_${index}_repPrayer`),
    offeringPrayer: field(fd, `worship_${index}_offeringPrayer`),
    offeringCommittee: field(fd, `worship_${index}_offeringCommittee`),
    mealService: field(fd, `worship_${index}_mealService`),
  }));
  return {
    ...current,
    verse: field(fd, "verse") || current.verse,
    heldAt: field(fd, "heldAt"),
    place: field(fd, "place"),
    goalYouth: countField(fd, "goalYouth") ?? current.goalYouth,
    goalCoramdeo: countField(fd, "goalCoramdeo") ?? current.goalCoramdeo,
    agendaOwners: MONTHLY_AGENDA.map((_, index) => field(fd, `agenda_${index}`)),
    annual: pad(
      Array.from({ length: ANNUAL_SLOTS }, (_, index) => pointFromForm(fd, "annual", index)),
      ANNUAL_SLOTS,
      () => ({ label: "", dept4: null, dept13: null }),
    ),
    previousWeeks: pad(
      Array.from({ length: WEEK_SLOTS }, (_, index) => pointFromForm(fd, "week", index)),
      WEEK_SLOTS,
      () => ({ label: "", dept4: null, dept13: null }),
    ),
    worship,
    teams: current.teams.map((team) => teamFromForm(team, fd, true)),
    business,
    finance: field(fd, "finance"),
    safety: field(fd, "safety"),
    other: field(fd, "other"),
    minutes: field(fd, "minutes"),
    announcements: field(fd, "announcements"),
    calendar: current.calendar.map((_, index) => ({
      saturday: field(fd, `cal_${index}_saturday`),
      saturdayEvent: field(fd, `cal_${index}_saturdayEvent`),
      sunday: field(fd, `cal_${index}_sunday`),
      sundayEvent: field(fd, `cal_${index}_sundayEvent`),
    })),
    calendarNote: field(fd, "calendarNote"),
    updatedAt: now,
  };
}

function teamFromForm(team: TeamSection, fd: FormData, includeEditor: boolean): TeamSection {
  const editor = includeEditor ? field(fd, `editor_${team.teamKey}`) || null : team.editorUserId;
  return {
    ...team,
    editorUserId: editor,
    lastMonth: field(fd, `last_${team.teamKey}`),
    thisMonth: field(fd, `plan_${team.teamKey}`),
    coramdeoRows: team.coramdeoRows
      ? team.coramdeoRows.map((_, index) => ({
          label: field(fd, `coram_${index}_label`),
          count: field(fd, `coram_${index}_count`),
        }))
      : null,
  };
}

export function applyTeamForm(
  current: MonthlyAssembly,
  teamKey: MonthlyTeamKey,
  fd: FormData,
  now = new Date().toISOString(),
): MonthlyAssembly {
  return {
    ...current,
    teams: current.teams.map((team) => (team.teamKey === teamKey ? teamFromForm(team, fd, false) : team)),
    updatedAt: now,
  };
}

/** 8월 자료에서 확인한 출석 숫자. 앱 출석이 쌓이기 전 예시로 쓴다. */
export function august2026Sample(now = "2026-08-14T12:00:00.000Z"): MonthlyAssembly {
  const assembly = blankAssembly(2026, 8, now);
  const annual: HeadcountPoint[] = [
    ["25년 8월", 182, 43],
    ["25년 9월", 183, 43],
    ["25년 10월", 157, 49],
    ["25년 11월", 186, 39],
    ["25년 12월", 182, 37],
    ["26년 1월", 207, 68],
    ["26년 2월", 188, 92],
    ["26년 3월", 203, 106],
    ["26년 4월", 199, 101],
    ["26년 5월", 189, 97],
    ["26년 6월", 195, 93],
    ["26년 7월", 185, 66],
  ].map(([label, dept4, dept13]) => ({
    label: String(label),
    dept4: Number(dept4),
    dept13: Number(dept13),
  }));
  const previousWeeks: HeadcountPoint[] = [
    ["5일", 169, 70],
    ["12일", 148, 53],
    ["19일", 216, 85],
    ["26일", 210, 57],
  ].map(([label, dept4, dept13]) => ({
    label: String(label),
    dept4: Number(dept4),
    dept13: Number(dept13),
  }));
  return normalizeAssembly(assembly.id, {
    ...assembly,
    status: "published",
    heldAt: "2026년 8월 14일 오후 9시 40분",
    place: "디사이플홀",
    agendaOwners: [
      "김광림 부회장",
      "박기도 서기",
      "박기도 서기",
      "각 팀 팀장",
      "이승석 부총무",
      "우재황 부회계",
      "김광림 부회장",
      "김광림 부회장",
      "박기도 서기",
      "이승석 부총무",
      "위성해 가장",
    ],
    annual,
    previousWeeks,
    publishedAt: now,
    teams: assembly.teams.map((team) => {
      if (team.teamKey === "new_family") {
        return {
          ...team,
          lastMonth: "7월 새가족 등록·출석·등반·수료 현황",
          thisMonth: "새가족 공부 후 식사와 교제, 기도제목 공유",
        };
      }
      if (team.teamKey === "coramdeo") {
        return {
          ...team,
          lastMonth: "코람데오 기도회 진행(7/1, 7/8, 7/15, 7/22)",
          thisMonth: "매주 수요일 진행. 매달 정기모임 및 기도 모임",
        };
      }
      return team;
    }),
  });
}
