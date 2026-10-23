import assert from "node:assert/strict";
import { test } from "node:test";
import { canUploadMeetingScore, canViewMeetingAsset } from "../src/lib/meeting-assets";
import type { LeaderMeeting, MeetingAsset } from "../src/lib/types";

const meeting = (leader: string | null): LeaderMeeting => ({
  id: "m1", title: "10월 23일", date: "2026-10-23T11:00:00.000Z", notes: null,
  prayerLeaderId: leader, dutyUserIds: { prayer_meeting_lead: leader }, createdAt: "2026-10-01T00:00:00.000Z",
});
const leader = { id: "u-lead", role: "LEADER" as const, officerTitle: null };
const otherLeader = { id: "u-other", role: "LEADER" as const, officerTitle: null };
const officer = { id: "u-off", role: "LEADER" as const, officerTitle: "총무" as const };
const pastor = { id: "u-p", role: "PASTOR" as const, officerTitle: null };
const admin = { id: "u-a", role: "ADMIN" as const, officerTitle: null };
const guest = { id: "u-g", role: "ATTENDEE" as const, officerTitle: null };

test("악보 업로드: 그 모임 인도자만 (가장 중)", () => {
  assert.equal(canUploadMeetingScore(meeting("u-lead"), leader), true);
  assert.equal(canUploadMeetingScore(meeting("u-lead"), otherLeader), false);
  assert.equal(canUploadMeetingScore(meeting("u-lead"), guest), false);
  assert.equal(canUploadMeetingScore(meeting("u-lead"), null), false);
});

test("악보 업로드: 임원·목사·관리자는 인도자 미지정이어도 가능", () => {
  for (const u of [officer, pastor, admin]) {
    assert.equal(canUploadMeetingScore(meeting("u-lead"), u), true);
    assert.equal(canUploadMeetingScore(meeting(null), u), true);
  }
  assert.equal(canUploadMeetingScore(meeting(null), leader), false);
});

test("악보 열람은 누구나", () => {
  const score: MeetingAsset = { id: "a", meetingId: "m1", kind: "SCORE", fileName: "s.pdf", storageKey: "k", uploadedById: "u-lead", createdAt: "x" } as MeetingAsset;
  for (const u of [leader, otherLeader, guest, officer]) assert.equal(canViewMeetingAsset(score, u), true);
});
