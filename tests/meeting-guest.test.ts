import assert from "node:assert/strict";
import { test } from "node:test";
import {
  guestCanOpenMeeting,
  guestHasOpenMeeting,
  guestMeetingDayOpen,
  isScopedMeetingGuest,
} from "../src/lib/meeting-guest";

const friday = "2026-10-16T19:00:00+09:00";

test("게스트만 모임 날까지로 제한한다", () => {
  assert.equal(isScopedMeetingGuest({ role: "ATTENDEE", attendeeKind: "guest" }), true);
  assert.equal(isScopedMeetingGuest({ role: "ATTENDEE", attendeeKind: null }), true);
  assert.equal(isScopedMeetingGuest({ role: "ATTENDEE", attendeeKind: "new_family" }), false);
  assert.equal(isScopedMeetingGuest({ role: "LEADER", attendeeKind: null }), false);
});

test("모임 날이 지나기 전까지 열고, 다음 날이면 닫는다", () => {
  assert.equal(guestMeetingDayOpen(friday, "2026-10-16"), true);
  assert.equal(guestMeetingDayOpen(friday, "2026-10-15"), true);
  assert.equal(guestMeetingDayOpen(friday, "2026-10-17"), false);
});

test("넣은 게스트만 그 모임을 연다", () => {
  const meeting = { date: friday, guestUserIds: ["guest-1"] };
  assert.equal(guestCanOpenMeeting(meeting, "guest-1", "2026-10-16"), true);
  assert.equal(guestCanOpenMeeting(meeting, "guest-2", "2026-10-16"), false);
  assert.equal(guestCanOpenMeeting(meeting, "guest-1", "2026-10-17"), false);
  assert.equal(guestHasOpenMeeting([meeting], "guest-1", "2026-10-16"), true);
  assert.equal(guestHasOpenMeeting([meeting], "guest-1", "2026-10-17"), false);
});
