import assert from "node:assert/strict";
import { test } from "node:test";
import {
  POLL_ADMIN_AUDIENCE,
  canAdministerPoll,
  exchangePollAdminCode,
  generatePollAdminCode,
  hashPollAdminCode,
  isAllowedPollOrigin,
  isWellFormedPollAdminCode,
  newPollAdminCodeRecord,
  parsePollReturnTo,
  pollReturnUrlWithCode,
  type ExchangeDeps,
  type PollAdminCodeRecord,
} from "../src/lib/platform/poll-admin/contract";
import type { OfficerTitle, Role } from "../src/lib/types";

type U = { role: Role; officerTitle: OfficerTitle | null };
const u = (role: Role, officerTitle: OfficerTitle | null = null): U => ({ role, officerTitle });

function makeDeps(records: Map<string, PollAdminCodeRecord>, roles: Record<string, U>, now = 1_000_000) {
  const minted: Array<{ uid: string; claims: unknown }> = [];
  const deps: ExchangeDeps = {
    async consume(hash) {
      const r = records.get(hash) ?? null;
      records.delete(hash);
      return r;
    },
    async currentUser(id) {
      return roles[id] ?? null;
    },
    async mintToken(uid, claims) {
      minted.push({ uid, claims });
      return "custom-token";
    },
    now: () => now,
  };
  return { deps, minted };
}

test("관리 권한은 ADMIN·PASTOR·임원", () => {
  assert.equal(canAdministerPoll(u("ADMIN")), true);
  assert.equal(canAdministerPoll(u("PASTOR")), true);
  assert.equal(canAdministerPoll(u("LEADER", "총무")), true);
  assert.equal(canAdministerPoll(u("LEADER")), false);
  assert.equal(canAdministerPoll(u("ATTENDEE")), false);
  assert.equal(canAdministerPoll(null), false);
});

test("code는 256비트 base64url", () => {
  const c = generatePollAdminCode();
  assert.ok(isWellFormedPollAdminCode(c));
  assert.notEqual(c, generatePollAdminCode());
  assert.equal(isWellFormedPollAdminCode("short"), false);
});

test("오리진·return_to는 투표 두 곳만", () => {
  assert.ok(isAllowedPollOrigin("https://dcc.leessosso.uk"));
  assert.ok(isAllowedPollOrigin("https://leessosso.github.io"));
  assert.equal(isAllowedPollOrigin("https://evil.example"), false);
  assert.equal(isAllowedPollOrigin(null), false);
  assert.ok(parsePollReturnTo("https://dcc.leessosso.uk/poll/admin"));
  assert.ok(parsePollReturnTo("https://leessosso.github.io/poll/admin"));
  assert.equal(parsePollReturnTo("https://leessosso.github.io/other"), null);
  assert.equal(parsePollReturnTo("http://dcc.leessosso.uk/poll/admin"), null);
  assert.equal(parsePollReturnTo("https://dcc.leessosso.uk.evil.example/poll/"), null);
  assert.equal(parsePollReturnTo("javascript:alert(1)"), null);
});

test("code는 프래그먼트에 싣는다", () => {
  const u = pollReturnUrlWithCode(parsePollReturnTo("https://dcc.leessosso.uk/poll/admin#old")!, "abc");
  assert.equal(u, "https://dcc.leessosso.uk/poll/admin#code=abc");
});

test("정상 교환: admin true(boolean)·mid만 클레임, 같은 code 재사용은 410", async () => {
  const code = generatePollAdminCode();
  const records = new Map([[hashPollAdminCode(code), newPollAdminCodeRecord("mem1", "u1", 999_000)]]);
  const { deps, minted } = makeDeps(records, { u1: u("ADMIN") });
  const body = { code, audience: POLL_ADMIN_AUDIENCE };
  const ok = await exchangePollAdminCode({ body, sessionUserId: "u1" }, deps);
  assert.deepEqual(ok, { status: 200, body: { firebaseToken: "custom-token" } });
  assert.deepEqual(minted[0], { uid: "shell_mem1", claims: { admin: true, mid: "mem1" } });
  const again = await exchangePollAdminCode({ body, sessionUserId: "u1" }, deps);
  assert.equal(again.status, 410);
});

test("오류 코드: audience 400, 형식 400, 만료 410, 강등 403, 세션 불일치 403", async () => {
  const code = generatePollAdminCode();
  const fresh = () => new Map([[hashPollAdminCode(code), newPollAdminCodeRecord("m", "u1", 999_000)]]);
  const run = async (body: unknown, roles: Record<string, U>, session: string | null, now = 1_000_000) =>
    (await exchangePollAdminCode({ body, sessionUserId: session }, makeDeps(fresh(), roles, now).deps)).status;
  assert.equal(await run({ code, audience: "x" }, { u1: u("ADMIN") }, "u1"), 400);
  assert.equal(await run({ code: "bad", audience: POLL_ADMIN_AUDIENCE }, { u1: u("ADMIN") }, "u1"), 400);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, { u1: u("ADMIN") }, "u1", 1_060_000), 410);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, { u1: u("LEADER") }, "u1"), 403);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, { u1: u("ADMIN") }, "u2"), 403);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, { u1: u("ATTENDEE") }, "u1"), 403);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, { u1: u("LEADER", "회장") }, "u1"), 200);
  assert.equal(await run({ code, audience: POLL_ADMIN_AUDIENCE }, {}, "u1"), 401);
});

test("토큰 발급 실패는 500", async () => {
  const code = generatePollAdminCode();
  const records = new Map([[hashPollAdminCode(code), newPollAdminCodeRecord("m", "u1", 999_000)]]);
  const { deps } = makeDeps(records, { u1: u("PASTOR") });
  deps.mintToken = async () => {
    throw new Error("x");
  };
  const r = await exchangePollAdminCode({ body: { code, audience: POLL_ADMIN_AUDIENCE }, sessionUserId: null }, deps);
  assert.deepEqual(r, { status: 500, body: { error: "token_mint_failed" } });
});
