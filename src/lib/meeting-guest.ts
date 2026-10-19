import { kstDateKeyFromIso } from "@/lib/kst-date";
import type { AttendeeKind, LeaderMeeting, Role } from "@/lib/types";

type GuestViewer = { role: Role; attendeeKind: AttendeeKind | null };

/** 새가족팀원은 매주 나오고, 게스트만 넣은 모임 날까지 본다. */
export function isScopedMeetingGuest(user: GuestViewer): boolean {
  return user.role === "ATTENDEE" && user.attendeeKind !== "new_family";
}

export function meetingGuestIds(meeting: Pick<LeaderMeeting, "guestUserIds">): string[] {
  return meeting.guestUserIds ?? [];
}

/** 모임 날(서울)이 오늘이거나 아직 오지 않았으면 연다. 시작 시각이 지나도 그날은 연다. */
export function guestMeetingDayOpen(meetingDateIso: string, todayKey: string): boolean {
  return kstDateKeyFromIso(meetingDateIso) >= todayKey;
}

export function guestCanOpenMeeting(
  meeting: Pick<LeaderMeeting, "date" | "guestUserIds">,
  userId: string,
  todayKey: string,
): boolean {
  return meetingGuestIds(meeting).includes(userId) && guestMeetingDayOpen(meeting.date, todayKey);
}

export function guestHasOpenMeeting(
  meetings: Pick<LeaderMeeting, "date" | "guestUserIds">[],
  userId: string,
  todayKey: string,
): boolean {
  return meetings.some((meeting) => guestCanOpenMeeting(meeting, userId, todayKey));
}
