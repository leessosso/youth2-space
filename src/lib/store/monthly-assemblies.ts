import {
  annualPointsFromWeekly,
  assemblyFromForm,
  assemblyId,
  applyTeamForm,
  blankAssembly,
  nextAssemblyFrom,
  normalizeAssembly,
  previousMonth,
  weekPointsForMonth,
  weeklyHeadcount,
  type MonthlyAssembly,
  type MonthlyTeamKey,
  type SundayHeadcount,
} from "@/lib/monthly-assembly";
import { kstDateKeyFromIso } from "@/lib/kst-date";
import { monthlyAssembliesCol, withId } from "@/lib/store/collections";
import { listAttendanceSundays, listMarksBySunday } from "@/lib/store/attendance";

export async function listMonthlyAssemblies(): Promise<MonthlyAssembly[]> {
  const snap = await monthlyAssembliesCol.get();
  return snap.docs
    .map((doc) => normalizeAssembly(doc.id, withId(doc)))
    .sort((a, b) => b.id.localeCompare(a.id));
}

export async function getMonthlyAssembly(id: string): Promise<MonthlyAssembly | null> {
  const doc = await monthlyAssembliesCol.doc(id).get();
  if (!doc.exists) return null;
  return normalizeAssembly(doc.id, doc.data() ?? {});
}

export async function saveMonthlyAssemblyDoc(assembly: MonthlyAssembly): Promise<void> {
  const { id, ...body } = assembly;
  await monthlyAssembliesCol.doc(id).set(body);
}

export async function createMonthlyAssembly(input: {
  year: number;
  month: number;
  copyPrevious: boolean;
}): Promise<MonthlyAssembly> {
  const id = assemblyId(input.year, input.month);
  const existing = await getMonthlyAssembly(id);
  if (existing) throw new Error("ALREADY_EXISTS");

  const now = new Date().toISOString();
  if (!input.copyPrevious) {
    const created = blankAssembly(input.year, input.month, now);
    await saveMonthlyAssemblyDoc(created);
    return created;
  }

  const all = await listMonthlyAssemblies();
  const previous = all.find((item) => item.id < id) ?? null;
  const created = previous
    ? nextAssemblyFrom(previous, input.year, input.month, now)
    : blankAssembly(input.year, input.month, now);
  await saveMonthlyAssemblyDoc(created);
  return created;
}

export async function saveMonthlyAssemblyForm(id: string, fd: FormData): Promise<MonthlyAssembly> {
  const current = await getMonthlyAssembly(id);
  if (!current) throw new Error("NOT_FOUND");
  const next = assemblyFromForm(current, fd);
  await saveMonthlyAssemblyDoc(next);
  return next;
}

export async function saveMonthlyTeamForm(
  id: string,
  teamKey: MonthlyTeamKey,
  fd: FormData,
): Promise<MonthlyAssembly> {
  const current = await getMonthlyAssembly(id);
  if (!current) throw new Error("NOT_FOUND");
  const next = applyTeamForm(current, teamKey, fd);
  await saveMonthlyAssemblyDoc(next);
  return next;
}

export async function setMonthlyAssemblyStatus(
  id: string,
  status: MonthlyAssembly["status"],
): Promise<void> {
  const current = await getMonthlyAssembly(id);
  if (!current) throw new Error("NOT_FOUND");
  const now = new Date().toISOString();
  await saveMonthlyAssemblyDoc({
    ...current,
    status,
    publishedAt: status === "published" ? now : null,
    updatedAt: now,
  });
}

export async function attendanceHeadcounts(): Promise<SundayHeadcount[]> {
  const sundays = (await listAttendanceSundays()).filter((sunday) => sunday.kind !== "special");
  const rows = await Promise.all(
    sundays.map(async (sunday) => {
      const marks = await listMarksBySunday(sunday.id);
      if (marks.length === 0) return null;
      return {
        dateKey: kstDateKeyFromIso(sunday.date),
        ...weeklyHeadcount(marks),
      };
    }),
  );
  return rows.filter((row): row is SundayHeadcount => row != null);
}

/** 앱에 쌓인 주일 출석으로 연간 평균과 지난달 주별 칸을 채운다. 기록이 없으면 기존 숫자를 둔다. */
export async function fillAssemblyAttendance(id: string): Promise<{ filled: boolean }> {
  const current = await getMonthlyAssembly(id);
  if (!current) throw new Error("NOT_FOUND");
  const counts = await attendanceHeadcounts();
  const prev = previousMonth(current.year, current.month);
  const weeks = weekPointsForMonth(counts, prev.year, prev.month);
  const annual = annualPointsFromWeekly(counts, current.year, current.month);
  if (weeks.length === 0 && annual.length === 0) return { filled: false };
  const next = normalizeAssembly(id, {
    ...current,
    annual: annual.length > 0 ? annual : current.annual,
    previousWeeks: weeks.length > 0 ? weeks : current.previousWeeks,
    updatedAt: new Date().toISOString(),
  });
  await saveMonthlyAssemblyDoc(next);
  return { filled: true };
}
