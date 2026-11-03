import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { exportPKCS8, exportSPKI, generateKeyPair, importSPKI, jwtVerify, decodeProtectedHeader } from "jose";
import {
  FIREBASE_CUSTOM_TOKEN_AUDIENCE,
  normalizePrivateKey,
  readPollServiceAccount,
  signFirebaseCustomToken,
} from "../src/lib/platform/poll-admin/custom-token";
import { pollAdminClaims, pollAdminUid } from "../src/lib/platform/poll-admin/contract";

const EMAIL = "poll-sa@dcc-poll.iam.gserviceaccount.com";

test("커스텀 토큰은 RS256, 공개키로 검증되고 계약 클레임만 싣는다", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const pem = await exportPKCS8(privateKey);
  // Vercel env처럼 줄바꿈을 리터럴 \n으로 넣어도 읽힌다.
  const account = readPollServiceAccount({
    POLL_FIREBASE_CLIENT_EMAIL: EMAIL,
    POLL_FIREBASE_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
  } as unknown as NodeJS.ProcessEnv);
  assert.ok(account);
  const now = Math.floor(Date.now() / 1000);
  const token = await signFirebaseCustomToken(account!, pollAdminUid("mem1"), pollAdminClaims("mem1"), now);
  assert.equal(decodeProtectedHeader(token).alg, "RS256");
  const pub = await importSPKI(await exportSPKI(publicKey), "RS256");
  const { payload } = await jwtVerify(token, pub, { issuer: EMAIL, subject: EMAIL, audience: FIREBASE_CUSTOM_TOKEN_AUDIENCE });
  assert.equal(payload.uid, "shell_mem1");
  assert.deepEqual(payload.claims, { admin: true, mid: "mem1" });
  assert.equal((payload.claims as { admin: unknown }).admin, true);
  assert.equal(payload.exp! - payload.iat!, 3600);
});

test("서비스 계정이 없으면 null", () => {
  assert.equal(readPollServiceAccount({} as unknown as NodeJS.ProcessEnv), null);
  assert.equal(normalizePrivateKey("a\\nb"), "a\nb");
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

test("src 어디에서도 firebase-admin/auth를 import하지 않는다(ERR_REQUIRE_ESM 방지)", () => {
  const hits = walk("src").filter((f) => /from\s+["']firebase-admin\/auth["']|require\(["']firebase-admin\/auth["']\)/.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits, []);
});

test("두 라우트 모듈이 로드된다", async () => {
  const sso = await import("../src/app/api/platform/poll-admin-sso/route");
  const token = await import("../src/app/api/poll/firebase-token/route");
  assert.equal(typeof sso.GET, "function");
  assert.equal(typeof token.POST, "function");
  assert.equal(typeof token.OPTIONS, "function");
});
