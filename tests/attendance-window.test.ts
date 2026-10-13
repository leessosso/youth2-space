import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isWeeklyAttendanceOpen,
  recentSundayDateKeys,
  targetSundayKey,
  weeklyAttendanceCloseDateKey,
  weeklyAttendanceLockedMessage,
  weeklyAttendanceWindow,
} from "../src/lib/kst-date";

// 2026-10-11(일) ~ 2026-10-17(토), 서울 정오
const at = (d: string, t = "12:00") => new Date(`${d}T${t}:00+09:00`);

test("대상 주일: 일~화는 지난 주일, 수~토는 다가오는 주일", () => {
  assert.equal(targetSundayKey(at("2026-10-11")), "2026-10-11");
  assert.equal(targetSundayKey(at("2026-10-12")), "2026-10-11");
  assert.equal(targetSundayKey(at("2026-10-13", "23:59")), "2026-10-11");
  assert.equal(targetSundayKey(at("2026-10-14", "00:00")), "2026-10-18");
  assert.equal(targetSundayKey(at("2026-10-17", "23:59")), "2026-10-18");
  assert.equal(targetSundayKey(at("2026-10-18", "00:00")), "2026-10-18");
});

test("UTC로는 화요일이어도 서울 수요일이면 다가오는 주일", () => {
  // 2026-10-13T15:30Z = 서울 10/14(수) 00:30
  assert.equal(targetSundayKey(new Date("2026-10-13T15:30:00Z")), "2026-10-18");
});

test("입력 기간: 주일~화요일만 open", () => {
  const s = "2026-10-11";
  assert.equal(weeklyAttendanceCloseDateKey(s), "2026-10-13");
  assert.equal(weeklyAttendanceWindow(s, at("2026-10-10")), "upcoming");
  for (const d of ["2026-10-11", "2026-10-12", "2026-10-13"]) assert.equal(isWeeklyAttendanceOpen(s, at(d)), true, d);
  for (const d of ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]) {
    assert.equal(isWeeklyAttendanceOpen(s, at(d)), false, d);
    assert.equal(weeklyAttendanceWindow(s, at(d)), "closed");
  }
});

test("수~토의 다가오는 주일은 잠김(upcoming) + 안내 문구", () => {
  const now = at("2026-10-14");
  const target = targetSundayKey(now);
  assert.equal(weeklyAttendanceWindow(target, now), "upcoming");
  assert.match(weeklyAttendanceLockedMessage(target, now) ?? "", /주일 출석은 일~화요일에만 입력할 수 있어요/);
  assert.equal(weeklyAttendanceLockedMessage("2026-10-11", at("2026-10-12")), null);
});

test("주일 목록은 대상 주일부터", () => {
  assert.deepEqual(recentSundayDateKeys(2, at("2026-10-14")), ["2026-10-18", "2026-10-11"]);
  assert.deepEqual(recentSundayDateKeys(2, at("2026-10-13")), ["2026-10-11", "2026-10-04"]);
});
