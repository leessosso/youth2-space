/**
 * 앱 요약 API v1 응답 파서 (docs/platform-app-summary-api.md).
 * 모르는 필드는 무시하고, 셸이 그리는 데 필요한 필드만 관대하게 꺼낸다. 형식이 틀리면 null(카드 숨김).
 */

export const SUMMARY_VERSION = 1;

export type SummaryApp = "class-management" | "tongdok";

export type TrainingProgramSummary = {
  id: string;
  name: string;
  status: "active" | "ended";
  myRole: "trainee" | "secretary";
  attendance: { attended: number; total: number } | null;
  nextSession: { date: string; round: number | null } | null;
  pendingAssignments: number | null;
};

export type TongdokCohortSummary = {
  slug: string;
  title: string;
  progressPercent: number | null;
  today: { label: string; done: boolean; skipped: boolean } | null;
};

export type TrainingSummary = { app: "class-management"; programs: TrainingProgramSummary[] };
export type TongdokSummary = { app: "tongdok"; cohorts: TongdokCohortSummary[] };

type Obj = Record<string, unknown>;

function obj(v: unknown): Obj | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** 공통 봉투 확인. 연결 안 됨·버전 불일치·형식 오류는 null. */
function envelope(raw: unknown, app: SummaryApp): Obj | null {
  const o = obj(raw);
  if (!o) return null;
  if (o.version !== SUMMARY_VERSION) return null;
  if (o.app !== undefined && o.app !== app) return null;
  if (o.linked !== true) return null;
  return o;
}

export function parseTrainingSummary(raw: unknown): TrainingSummary | null {
  const o = envelope(raw, "class-management");
  if (!o || !Array.isArray(o.programs)) return null;
  const programs: TrainingProgramSummary[] = [];
  for (const item of o.programs) {
    const p = obj(item);
    const id = str(p?.id);
    const name = str(p?.name);
    if (!p || !id || !name) continue;
    const att = obj(p.attendance);
    const attended = num(att?.attended);
    const total = num(att?.total);
    const next = obj(p.nextSession);
    const nextDate = str(next?.date);
    const asg = obj(p.assignments);
    programs.push({
      id,
      name,
      status: p.status === "ended" ? "ended" : "active",
      myRole: p.myRole === "secretary" ? "secretary" : "trainee",
      attendance: attended != null && total != null ? { attended, total } : null,
      nextSession: nextDate ? { date: nextDate, round: num(next?.round) } : null,
      pendingAssignments: num(asg?.pendingCount),
    });
  }
  return { app: "class-management", programs };
}

export function parseTongdokSummary(raw: unknown): TongdokSummary | null {
  const o = envelope(raw, "tongdok");
  if (!o || !Array.isArray(o.cohorts)) return null;
  const cohorts: TongdokCohortSummary[] = [];
  for (const item of o.cohorts) {
    const c = obj(item);
    const slug = str(c?.slug);
    const title = str(c?.title);
    if (!c || !slug || !title) continue;
    const progress = obj(c.progress);
    const percent = num(progress?.percent);
    const today = obj(c.today);
    const label = str(today?.label);
    cohorts.push({
      slug,
      title,
      progressPercent: percent == null ? null : Math.max(0, Math.min(100, Math.round(percent))),
      today: label ? { label, done: today?.done === true, skipped: today?.skipped === true } : null,
    });
  }
  return { app: "tongdok", cohorts };
}

/** `YYYY-MM-DD` → `10/18`. 형식이 다르면 원문. */
export function shortDate(date: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${Number(m[1])}/${Number(m[2])}` : date;
}

/** 카드 한 줄 요약: `출석 6/8 · 다음 수업 10/18 · 미제출 과제 1` */
export function trainingLine(p: TrainingProgramSummary): string {
  const parts: string[] = [];
  if (p.attendance) parts.push(`출석 ${p.attendance.attended}/${p.attendance.total}`);
  if (p.nextSession) parts.push(`다음 수업 ${shortDate(p.nextSession.date)}`);
  else if (p.status === "ended") parts.push("종료");
  if (p.pendingAssignments) parts.push(`미제출 과제 ${p.pendingAssignments}`);
  return parts.join(" · ");
}

/** `진도 91% · 오늘 창세기 12–15장` */
export function tongdokLine(c: TongdokCohortSummary): string {
  const parts: string[] = [];
  if (c.progressPercent != null) parts.push(`진도 ${c.progressPercent}%`);
  if (c.today) {
    parts.push(c.today.skipped ? "오늘 쉬는 날" : `오늘 ${c.today.label}${c.today.done ? " ✓" : ""}`);
  }
  return parts.join(" · ");
}
