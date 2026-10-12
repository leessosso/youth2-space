import type { Role } from "@/lib/types";

/**
 * 역할별 셸 경로 접근 정책 (미들웨어 `authorized`에서 사용, 순수 함수라 테스트로 고정한다).
 * - MEMBER: 허용 목록(allowlist). 목록에 없는 경로는 모두 `/dashboard`로 보낸다.
 * - ATTENDEE: 기존 거부 목록 유지.
 * - 그 밖(PASTOR·ADMIN·LEADER): 전부 허용. 세부 권한은 각 페이지·서버 액션이 판단한다.
 *
 * 미들웨어는 1차 방어일 뿐이다. 리더 페이지는 `requireLeaderTier`, 서버 액션은 MEMBER 거부를 따로 한다.
 */

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** 정확히 그 경로만 */
const MEMBER_ALLOWED_EXACT = ["/", "/dashboard", "/announcements", "/hat", "/change-password", "/login"];

/** 하위 경로 포함 */
const MEMBER_ALLOWED_PREFIX = ["/me", "/training", "/tongdok", "/sorting-hat"];

/** `/announcements/{id}` 읽기만. 작성(`/announcements/new`)은 제외. */
const ANNOUNCEMENT_DETAIL = /^\/announcements\/(?!new(?:\/|$))[^/]+$/;

export function isAllowedForMember(path: string): boolean {
  if (MEMBER_ALLOWED_EXACT.includes(path)) return true;
  if (MEMBER_ALLOWED_PREFIX.some((prefix) => matchesPrefix(path, prefix))) return true;
  // basePath 앱 RSC flight (`/training.rsc`, `/tongdok.rsc`)
  if (path.startsWith("/training.") || path.startsWith("/tongdok.")) return true;
  return ANNOUNCEMENT_DETAIL.test(path);
}

const MEETING_ATTENDEE_BLOCKED = [
  "/attendance",
  "/reports",
  "/surveys",
  "/groups",
  "/admin",
  "/worship",
  "/my-group",
  "/hat/admin",
  "/announcements/new",
  "/training",
  "/tongdok",
];

export function isBlockedForMeetingAttendee(path: string): boolean {
  return MEETING_ATTENDEE_BLOCKED.some((prefix) => matchesPrefix(path, prefix));
}

/** 접근을 막을 때 보낼 경로. 허용이면 null. */
export function redirectForRole(role: Role | undefined, path: string): string | null {
  if (role === "MEMBER") return isAllowedForMember(path) ? null : "/dashboard";
  if (role === "ATTENDEE") return isBlockedForMeetingAttendee(path) ? "/meetings" : null;
  return null;
}
