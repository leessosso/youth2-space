import assert from "node:assert/strict";
import { test } from "node:test";
import { redirectForRole } from "../src/lib/access-policy";
import { afterFailure, isLocked, LOGIN_LOCK_MS, throttleIdentifier } from "../src/lib/login-throttle-policy";
import { sameTargetIds, selectLeaderResetTargets, selectOfficerResetTargets } from "../src/lib/role-reset";
import type { Role } from "../src/lib/types";

const ROLES: Role[] = ["PASTOR", "ADMIN", "LEADER", "ATTENDEE", "MEMBER"];

/** 역할 × 경로 접근 매트릭스. true = 미들웨어 통과. */
const MATRIX: Record<string, Record<Role, boolean>> = {
  "/": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/dashboard": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/me": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/announcements": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/announcements/abc123": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/announcements/new": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/hat": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: true },
  "/hat/admin": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/training": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: true },
  "/training/sso/consume": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: true },
  "/tongdok": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: true },
  "/tongdok/sso/consume": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: true },
  "/meetings": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: false },
  "/meetings/m1": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: false },
  "/attendance": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/attendance/s1/g1": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/reports": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/surveys": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/groups": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/admin/members": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/admin/handover": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/worship": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/my-group": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: false, MEMBER: false },
  "/api/meetings/m1/assets/a1": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: false },
  "/some-future-page": { PASTOR: true, ADMIN: true, LEADER: true, ATTENDEE: true, MEMBER: false },
};

for (const [path, row] of Object.entries(MATRIX)) {
  for (const role of ROLES) {
    test(`${role} ${path} → ${row[role] ? "허용" : "차단"}`, () => {
      assert.equal(redirectForRole(role, path) === null, row[role]);
    });
  }
}

test("차단 시 MEMBER는 /dashboard, ATTENDEE는 /meetings", () => {
  assert.equal(redirectForRole("MEMBER", "/attendance"), "/dashboard");
  assert.equal(redirectForRole("ATTENDEE", "/attendance"), "/meetings");
});

test("로그인 잠금: 5번 실패하면 10분 잠금, 이후 해제", () => {
  const t0 = 1_000_000;
  let s = afterFailure(null, t0);
  for (let i = 1; i < 4; i++) s = afterFailure(s, t0 + i);
  assert.equal(isLocked(s, t0 + 5), false);
  s = afterFailure(s, t0 + 5);
  assert.equal(isLocked(s, t0 + 6), true);
  assert.equal(isLocked(s, t0 + 5 + LOGIN_LOCK_MS), false);
});

test("로그인 잠금: 10분 창이 지나면 실패 횟수 초기화", () => {
  const t0 = 1_000_000;
  let s = afterFailure(null, t0);
  for (let i = 1; i < 4; i++) s = afterFailure(s, t0 + i);
  s = afterFailure(s, t0 + 11 * 60 * 1000);
  assert.equal(s.failures, 1);
  assert.equal(isLocked(s, t0 + 11 * 60 * 1000), false);
});

test("잠금 식별자: 접미사 이름은 구분, 전화번호는 숫자만", () => {
  assert.notEqual(throttleIdentifier("김태희A"), throttleIdentifier("김태희B"));
  assert.equal(throttleIdentifier(" 010-1234-5678 "), throttleIdentifier("01012345678"));
});

const users = [
  { id: "p", name: "목사", role: "PASTOR" as Role, officerTitle: null },
  { id: "a", name: "관리", role: "ADMIN" as Role, officerTitle: "회장" as const },
  { id: "o", name: "임원", role: "LEADER" as Role, officerTitle: "총무" as const },
  { id: "l1", name: "가장1", role: "LEADER" as Role, officerTitle: null },
  { id: "l2", name: "가장2", role: "LEADER" as Role, officerTitle: null },
  { id: "n", name: "새가족", role: "ATTENDEE" as Role, officerTitle: null },
  { id: "m", name: "성도", role: "MEMBER" as Role, officerTitle: null },
  { id: "me", name: "실행자", role: "LEADER" as Role, officerTitle: "회장" as const },
];

test("임원 초기화 대상: 직책 있는 LEADER·MEMBER만, 목사·관리자·참석·본인 제외", () => {
  assert.deepEqual(selectOfficerResetTargets(users, "me").map((t) => t.id), ["o"]);
});

test("가장 초기화 대상: 직책 없는 LEADER만, 가족 가장 자리 표시", () => {
  const targets = selectLeaderResetTargets(users, [{ id: "g1", name: "1가족", currentLeaderId: "l1" }], "me");
  assert.deepEqual(targets.map((t) => t.id), ["l1", "l2"]);
  assert.deepEqual(targets[0].groupIds, ["g1"]);
  assert.deepEqual(targets[1].groupIds, []);
});

test("미리보기 이후 대상이 바뀌면 실행 거부", () => {
  assert.equal(sameTargetIds(["a", "b"], [{ id: "b" }, { id: "a" }]), true);
  assert.equal(sameTargetIds(["a"], [{ id: "a" }, { id: "c" }]), false);
});
