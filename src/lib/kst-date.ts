const KST = "Asia/Seoul";

/** Firestore에 저장된 ISO 시각을 서울 달력 날짜(YYYY-MM-DD)로 본다. */
export function kstDateKeyFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** 지금 시각의 서울 달력 날짜(YYYY-MM-DD). */
export function kstDateKeyNow(): string {
  return kstDateKeyFromIso(new Date().toISOString());
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** 서울 달력의 날짜와 요일(일=0). */
export function kstCalendar(date: Date): { dateKey: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_INDEX[get("weekday")];
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: weekday ?? 0,
  };
}

/** YYYY-MM-DD에 일수를 더한다. 한국은 서머타임이 없어 달력 날짜만 옮긴다. */
export function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 오늘이 일요일이면 오늘, 아니면 가장 최근 일요일. */
export function mostRecentSundayKey(now = new Date()): string {
  const { dateKey, weekday } = kstCalendar(now);
  return shiftDateKey(dateKey, -weekday);
}

/** 주일 출석은 일·월·화(서울)에만 입력한다. 화요일 = 주일 + 2일. */
export const WEEKLY_ATTENDANCE_OPEN_DAYS = 3;

export const WEEKLY_ATTENDANCE_WINDOW_NOTICE = "주일 출석은 일~화요일에만 입력할 수 있어요";

/** 그 주일 출석을 닫는 날(마지막 입력일). 주일로부터 2일 뒤인 화요일. */
export function weeklyAttendanceCloseDateKey(sundayDateKey: string): string {
  return shiftDateKey(sundayDateKey, WEEKLY_ATTENDANCE_OPEN_DAYS - 1);
}

/**
 * 지금 '이번 주' 출석으로 보여줄 주일.
 * 일~화에는 방금 지난(또는 오늘) 주일, 수~토에는 다가오는 주일.
 * 예: 10/14(수)면 10/18 주일.
 */
export function targetSundayKey(now = new Date()): string {
  const { dateKey, weekday } = kstCalendar(now);
  return weekday < WEEKLY_ATTENDANCE_OPEN_DAYS
    ? shiftDateKey(dateKey, -weekday)
    : shiftDateKey(dateKey, 7 - weekday);
}

export type WeeklyAttendanceWindow = "open" | "upcoming" | "closed";

/**
 * 주일 출석 입력 상태.
 * - open: 그 주일부터 화요일까지
 * - upcoming: 아직 주일이 오지 않음(수~토에 보는 다가오는 주일 포함)
 * - closed: 화요일이 지난 주일
 */
export function weeklyAttendanceWindow(sundayDateKey: string, now = new Date()): WeeklyAttendanceWindow {
  const today = kstCalendar(now).dateKey;
  if (today < sundayDateKey) return "upcoming";
  if (today <= weeklyAttendanceCloseDateKey(sundayDateKey)) return "open";
  return "closed";
}

/** 그 주일 출석을 지금 입력할 수 있는지 (일~화). */
export function isWeeklyAttendanceOpen(sundayDateKey: string, now = new Date()): boolean {
  return weeklyAttendanceWindow(sundayDateKey, now) === "open";
}

/** 입력할 수 없는 주일에 보여줄 짧은 안내. */
export function weeklyAttendanceLockedMessage(sundayDateKey: string, now = new Date()): string | null {
  const w = weeklyAttendanceWindow(sundayDateKey, now);
  if (w === "open") return null;
  if (w === "upcoming") return `${WEEKLY_ATTENDANCE_WINDOW_NOTICE}. 주일이 되면 입력이 열립니다.`;
  return `${WEEKLY_ATTENDANCE_WINDOW_NOTICE}. 지난 주일 출석은 수정할 수 없습니다.`;
}

export function isKstSunday(now = new Date()): boolean {
  return kstCalendar(now).weekday === 0;
}

/** 지금 대상 주일(수~토면 다가오는 주일)부터 과거로 count개의 일요일. */
export function recentSundayDateKeys(count: number, now = new Date()): string[] {
  const latest = targetSundayKey(now);
  return Array.from({ length: count }, (_, i) => shiftDateKey(latest, -7 * i));
}

export function sundayTitleFromDateKey(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return `${month}월 ${day}일 주일`;
}

/** 서울 정오. UTC 자정으로 저장하면 날짜가 전날로 밀릴 수 있어 정오를 쓴다. */
export function dateKeyToKstNoonIso(dateKey: string): string {
  return `${dateKey}T12:00:00.000+09:00`;
}
