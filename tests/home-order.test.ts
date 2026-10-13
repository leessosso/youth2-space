import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHomeCards, type HomeCardBuildContext } from "../src/lib/platform/home-cards";
import { orderByNearestDate, pickDashboardMeeting } from "../src/lib/platform/home-order";

type M = { id: string; date: string };
const key = (m: M) => m.date;
const TODAY = "2026-10-13";

test("pickDashboardMeeting: 오늘 이후 가장 가까운 모임", () => {
  const ms: M[] = [
    { id: "nov", date: "2026-11-10" },
    { id: "oct20", date: "2026-10-20" },
    { id: "oct9", date: "2026-10-09" },
  ];
  assert.deepEqual(pickDashboardMeeting(ms, key, TODAY), { meeting: ms[1], date: "2026-10-20", kind: "upcoming" });
});

test("pickDashboardMeeting: 오늘 모임은 다가오는 모임", () => {
  const ms: M[] = [{ id: "t", date: TODAY }, { id: "p", date: "2026-10-09" }];
  assert.equal(pickDashboardMeeting(ms, key, TODAY)?.kind, "upcoming");
});

test("pickDashboardMeeting: 지난 모임만 있으면 가장 최근", () => {
  const ms: M[] = [{ id: "sep", date: "2026-09-11" }, { id: "oct9", date: "2026-10-09" }];
  assert.deepEqual(pickDashboardMeeting(ms, key, TODAY), { meeting: ms[1], date: "2026-10-09", kind: "past" });
  assert.equal(pickDashboardMeeting([], key, TODAY), null);
});

test("리더 모임 카드 문구", () => {
  const base: HomeCardBuildContext = {
    personas: ["meeting_attendee"], latestSundayId: null, latestSundayTitle: null, myGroupId: null,
    myGroupName: null, familyReportHref: "/reports", missingAttendanceCount: 0, myAttendanceMissing: false,
    nextMeetingTitle: "10월 9일", nextMeetingHref: "/meetings/x",
  };
  const desc = (ctx: HomeCardBuildContext) => buildHomeCards(ctx).find((c) => c.id === "upcoming_meeting")!.description;
  assert.equal(desc(base), "다가오는 모임: 10월 9일");
  assert.equal(desc({ ...base, nextMeetingIsPast: true }), "지난 모임: 10월 9일");
});

test("정렬: 미래 가까운 순 → 지난 최근 순 → 날짜 없음", () => {
  const out = orderByNearestDate(
    [
      { item: "none", date: null },
      { item: "past", date: "2026-10-09" },
      { item: "far", date: "2026-11-01" },
      { item: "near", date: "2026-10-14" },
    ],
    TODAY,
  );
  assert.deepEqual(out, ["near", "far", "past", "none"]);
});
