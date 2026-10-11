import { format } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDateKo(d: Date | string) {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy년 M월 d일 (EEE)", { locale: ko });
}

export function formatDateTimeKo(d: Date | string) {
  return format(typeof d === "string" ? new Date(d) : d, "yyyy년 M월 d일 HH:mm", { locale: ko });
}

export function roleLabel(role: string) {
  switch (role) {
    case "PASTOR":
      return "목사";
    case "ADMIN":
      return "관리자";
    case "LEADER":
      return "리더";
    case "ATTENDEE":
      return "참석";
    default:
      return role;
  }
}

/** 화면에 보여줄 계정 구분. 참석 계정은 게스트와 새가족팀원을 나눈다. */
export function accountLabel(user: { role: string; attendeeKind?: string | null }) {
  if (user.role === "ATTENDEE") {
    return user.attendeeKind === "new_family" ? "새가족팀원" : "게스트";
  }
  return roleLabel(user.role);
}

export { termLabel } from "@/lib/term";
