import assert from "node:assert/strict";
import { test } from "node:test";
import { kstDateKeyFromIso, kstLocalDateTimeToIso } from "../src/lib/kst-date";
import { pickDashboardMeeting } from "../src/lib/platform/home-order";

test("datetime-local 입력은 서울 시각으로 저장된다", () => {
  assert.equal(kstLocalDateTimeToIso("2026-10-23T19:30"), "2026-10-23T10:30:00.000Z");
  assert.equal(kstDateKeyFromIso(kstLocalDateTimeToIso("2026-10-23T23:30")), "2026-10-23");
  assert.equal(kstLocalDateTimeToIso("2026-10-23T10:30:00.000Z"), "2026-10-23T10:30:00.000Z");
});

test("10/23 저녁 모임은 10/24 대시보드에서 지난 모임이다", () => {
  const m = { date: kstLocalDateTimeToIso("2026-10-23T19:30") };
  const picked = pickDashboardMeeting([m], (x) => kstDateKeyFromIso(x.date), "2026-10-24");
  assert.equal(picked?.kind, "past");
});
