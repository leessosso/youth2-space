import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { exportPKCS8, exportSPKI, generateKeyPair, importSPKI, jwtVerify, decodeProtectedHeader } from "jose";
import {
  FIREBASE_CUSTOM_TOKEN_AUDIENCE,
  normalizePrivateKey,
  readPollServiceAccount,
  signFirebaseCustomToken,
  type PollServiceAccount,
} from "../src/lib/platform/poll-admin/custom-token";
import {
  POLL_ADMIN_AUDIENCE,
  exchangePollAdminCode,
  generatePollAdminCode,
  hashPollAdminCode,
  newPollAdminCodeRecord,
  pollAdminClaims,
  pollAdminUid,
} from "../src/lib/platform/poll-admin/contract";
import { mintPollCustomToken } from "../src/lib/platform/poll-admin/server";
import { POST } from "../src/app/api/poll/firebase-token/route";
import {
  POLL_FIREBASE_CLIENT_EMAIL_ENV,
  POLL_FIREBASE_PRIVATE_KEY_ENV,
  POLL_TOKEN_MINT_REASONS,
  PollTokenMintError,
  classifyPollServiceAccount,
  isPollTokenMintReason,
  logTokenMintFailure,
  missingPollFirebaseEnvNames,
  tokenMintLogArgs,
  type PollTokenMintReason,
} from "../src/lib/platform/poll-admin/token-mint-diagnostic";

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
  assert.equal(classifyPollServiceAccount(account!), null);
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

const CANARY_KEY = "CANARY_KEY_MATERIAL_9f3a";
const CANARY_EXCEPTION = "CANARY_EXCEPTION_9f3a";
const CANARY_ENV = "CANARY_ENV_VALUE_9f3a";
const CANARY_UID = "CANARY_UID_9f3a";

function assertClean(blob: string, secrets: string[]) {
  const leaked =
    secrets.some((secret) => secret.length > 0 && blob.includes(secret)) ||
    blob.includes("PRIVATE KEY") ||
    blob.includes("BEGIN ") ||
    blob.includes("END ") ||
    /eyJ[A-Za-z0-9_-]{8,}\./.test(blob);
  assert.equal(leaked, false);
}

function dumpFailure(err: unknown, response: unknown, logs: unknown): string {
  const error = err as { message?: unknown; reason?: unknown; name?: unknown; cause?: unknown; stack?: unknown };
  return JSON.stringify({
    message: error?.message ?? null,
    reason: error?.reason ?? null,
    name: error?.name ?? null,
    cause: error?.cause ?? null,
    stack: error?.stack ?? null,
    response,
    logs,
  });
}

async function pkcs8Pem(): Promise<string> {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  return exportPKCS8(privateKey);
}

function armor(label: string, body: string): string {
  return ["-----BEGIN ", label, "-----\n", body, "\n-----END ", label, "-----\n"].join("");
}

function envWith(email: string, privateKey: string): NodeJS.ProcessEnv {
  return {
    [POLL_FIREBASE_CLIENT_EMAIL_ENV]: email,
    [POLL_FIREBASE_PRIVATE_KEY_ENV]: privateKey,
  } as unknown as NodeJS.ProcessEnv;
}

async function expectReason(
  account: PollServiceAccount,
  reason: PollTokenMintReason,
  secrets: string[],
  claims: Record<string, unknown> = { admin: true },
  uid = "shell_mem",
) {
  let thrown: unknown;
  try {
    await signFirebaseCustomToken(account, uid, claims);
  } catch (err) {
    thrown = err;
  }
  if (!(thrown instanceof PollTokenMintError)) assert.fail("분류된 오류가 아닙니다");
  assert.equal(thrown.reason, reason);
  assert.equal(thrown.message, reason);
  assert.equal(thrown.cause, undefined);
  const response = { error: "token_mint_failed", reason };
  assertClean(dumpFailure(thrown, response, tokenMintLogArgs(reason)), [...secrets, uid, account.clientEmail, account.privateKey, String(account.privateKey.length)]);
}

test("리터럴 개행은 이미 한 번만 정규화되고, 풀린 키는 실패로 보지 않는다", async () => {
  const pem = await pkcs8Pem();
  const once = pem.replaceAll("\n", "\\n");
  const account = readPollServiceAccount(envWith(EMAIL, once));
  assert.ok(account);
  assert.equal(classifyPollServiceAccount(account!), null);
  const over = normalizePrivateKey(pem.replaceAll("\n", "\\\\n"));
  assert.equal(hasEscapedNewline(over), true);
  assert.notEqual(over, pem);
});

function hasEscapedNewline(value: string): boolean {
  return /\\(?:n|\r?\n)/.test(value);
}

test("env_missing은 비어 있는 변수 이름만 남긴다", async () => {
  const both = missingPollFirebaseEnvNames({} as NodeJS.ProcessEnv);
  assert.deepEqual(both, [POLL_FIREBASE_CLIENT_EMAIL_ENV, POLL_FIREBASE_PRIVATE_KEY_ENV]);
  assert.deepEqual(tokenMintLogArgs("env_missing", {} as NodeJS.ProcessEnv), [
    "env_missing",
    POLL_FIREBASE_CLIENT_EMAIL_ENV,
    POLL_FIREBASE_PRIVATE_KEY_ENV,
  ]);

  const keyOnly = envWith(CANARY_ENV, "   ");
  assert.deepEqual(missingPollFirebaseEnvNames(keyOnly), [POLL_FIREBASE_PRIVATE_KEY_ENV]);
  assert.deepEqual(tokenMintLogArgs("env_missing", keyOnly), ["env_missing", POLL_FIREBASE_PRIVATE_KEY_ENV]);
  assertClean(JSON.stringify(tokenMintLogArgs("env_missing", keyOnly)), [CANARY_ENV]);

  const emailOnly = envWith("  ", CANARY_ENV);
  assert.deepEqual(missingPollFirebaseEnvNames(emailOnly), [POLL_FIREBASE_CLIENT_EMAIL_ENV]);
  assertClean(JSON.stringify(tokenMintLogArgs("env_missing", emailOnly)), [CANARY_ENV]);

  await assert.rejects(
    () => mintPollCustomToken("shell_mem", { admin: true, mid: "mem" }, keyOnly),
    (err: unknown) => err instanceof PollTokenMintError && err.reason === "env_missing" && err.message === "env_missing" && err.cause === undefined,
  );
});

test("key_not_pem", async () => {
  const privateKey = `not-a-pem-${CANARY_KEY}`;
  await expectReason({ clientEmail: EMAIL, privateKey }, "key_not_pem", [CANARY_KEY, privateKey]);
});

test("key_escaped_newlines", async () => {
  const pem = await pkcs8Pem();
  const literal = pem.replaceAll("\n", "\\n");
  await expectReason({ clientEmail: EMAIL, privateKey: literal }, "key_escaped_newlines", [CANARY_KEY, literal, pem]);

  const doubled = readPollServiceAccount(envWith(EMAIL, pem.replaceAll("\n", "\\\\n")));
  assert.ok(doubled);
  await expectReason(doubled!, "key_escaped_newlines", [doubled!.privateKey, pem]);
});

test("key_wrapped_quotes", async () => {
  const pem = await pkcs8Pem();
  const quoted = `"${pem.replaceAll("\n", "\\n")}"`;
  const account = readPollServiceAccount(envWith(EMAIL, quoted));
  assert.ok(account);
  await expectReason(account!, "key_wrapped_quotes", [quoted, account!.privateKey, pem]);

  const single = readPollServiceAccount(envWith(EMAIL, `'${pem}'`));
  assert.ok(single);
  await expectReason(single!, "key_wrapped_quotes", [single!.privateKey, pem]);
});

test("key_not_pkcs8", async () => {
  const pem = await pkcs8Pem();
  const label = ["RSA", "PRIVATE", "KEY"].join(" ");
  const pkcs1 = pem.replaceAll("PRIVATE KEY", label);
  await expectReason({ clientEmail: EMAIL, privateKey: pkcs1 }, "key_not_pkcs8", [pkcs1, pem, label]);
});

test("key_import_failed", async () => {
  const privateKey = armor("PRIVATE KEY", CANARY_KEY);
  await expectReason({ clientEmail: EMAIL, privateKey }, "key_import_failed", [CANARY_KEY, privateKey]);
});

test("client_email_invalid", async () => {
  const pem = await pkcs8Pem();
  await expectReason({ clientEmail: "not-an-email", privateKey: pem }, "client_email_invalid", ["not-an-email", pem]);
  await expectReason({ clientEmail: "bad email", privateKey: pem }, "client_email_invalid", ["bad email", pem]);
});

test("sign_failed", async () => {
  const pem = await pkcs8Pem();
  const claims: Record<string, unknown> = {};
  Object.defineProperty(claims, "boom", {
    enumerable: true,
    get() {
      throw new Error(CANARY_EXCEPTION);
    },
  });
  await expectReason({ clientEmail: EMAIL, privateKey: pem }, "sign_failed", [CANARY_EXCEPTION, pem, CANARY_UID], claims, CANARY_UID);
});

test("분류가 아닌 예외는 응답에 실리지 않는다", async () => {
  const code = generatePollAdminCode();
  const records = new Map([[hashPollAdminCode(code), newPollAdminCodeRecord("mem", "user-1", 999_000)]]);
  const result = await exchangePollAdminCode(
    { body: { code, audience: POLL_ADMIN_AUDIENCE }, sessionUserId: null },
    {
      async consume(hash) {
        const record = records.get(hash) ?? null;
        records.delete(hash);
        return record;
      },
      async currentUser() {
        return { role: "ADMIN", officerTitle: null };
      },
      async mintToken() {
        throw new Error(CANARY_EXCEPTION);
      },
      now: () => 1_000_000,
    },
  );
  assert.deepEqual(result, { status: 500, body: { error: "token_mint_failed" } });
  assertClean(JSON.stringify(result), [CANARY_EXCEPTION, code]);
});

test("교환 응답 reason은 서명 분류와 같고 비밀이 없다", async () => {
  const pem = await pkcs8Pem();
  const cases: Array<{ reason: PollTokenMintReason; account: PollServiceAccount; claims?: Record<string, unknown> }> = [
    { reason: "key_not_pem", account: { clientEmail: EMAIL, privateKey: `not-a-pem-${CANARY_KEY}` } },
    { reason: "key_escaped_newlines", account: { clientEmail: EMAIL, privateKey: pem.replaceAll("\n", "\\n") } },
    { reason: "key_wrapped_quotes", account: { clientEmail: EMAIL, privateKey: `"${pem}"` } },
    {
      reason: "key_not_pkcs8",
      account: { clientEmail: EMAIL, privateKey: pem.replaceAll("PRIVATE KEY", ["RSA", "PRIVATE", "KEY"].join(" ")) },
    },
    { reason: "key_import_failed", account: { clientEmail: EMAIL, privateKey: armor("PRIVATE KEY", CANARY_KEY) } },
    { reason: "client_email_invalid", account: { clientEmail: "not-an-email", privateKey: pem } },
  ];
  const signFailedClaims: Record<string, unknown> = {};
  Object.defineProperty(signFailedClaims, "boom", {
    enumerable: true,
    get() {
      throw new Error(CANARY_EXCEPTION);
    },
  });
  cases.push({ reason: "sign_failed", account: { clientEmail: EMAIL, privateKey: pem }, claims: signFailedClaims });

  for (const entry of cases) {
    const code = generatePollAdminCode();
    const records = new Map([[hashPollAdminCode(code), newPollAdminCodeRecord("mem", "user-1", 999_000)]]);
    const result = await exchangePollAdminCode(
      { body: { code, audience: POLL_ADMIN_AUDIENCE }, sessionUserId: null },
      {
        async consume(hash) {
          const record = records.get(hash) ?? null;
          records.delete(hash);
          return record;
        },
        async currentUser() {
          return { role: "ADMIN", officerTitle: null };
        },
        mintToken() {
          return signFirebaseCustomToken(entry.account, CANARY_UID, entry.claims ?? { admin: true, mid: "mem" });
        },
        now: () => 1_000_000,
      },
    );
    assert.deepEqual(result, { status: 500, body: { error: "token_mint_failed", reason: entry.reason } });
    assertClean(JSON.stringify(result), [
      CANARY_KEY,
      CANARY_EXCEPTION,
      CANARY_UID,
      code,
      entry.account.privateKey,
      entry.account.clientEmail,
      pem,
      String(entry.account.privateKey.length),
    ]);
  }
});

test("로그 인자는 분류 코드뿐이고 비밀 패턴이 없다", () => {
  const seen = new Set<string>();
  for (const reason of POLL_TOKEN_MINT_REASONS) {
    assert.equal(isPollTokenMintReason(reason), true);
    const args =
      reason === "env_missing"
        ? tokenMintLogArgs(reason, { [POLL_FIREBASE_CLIENT_EMAIL_ENV]: CANARY_ENV } as unknown as NodeJS.ProcessEnv)
        : tokenMintLogArgs(reason, envWith(CANARY_ENV, CANARY_KEY));
    seen.add(args[0]);
    assert.equal(args[0], reason);
    assertClean(JSON.stringify(args), [CANARY_ENV, CANARY_KEY, CANARY_EXCEPTION, EMAIL]);
  }
  assert.deepEqual([...seen].sort(), [...POLL_TOKEN_MINT_REASONS].sort());
  assert.deepEqual(tokenMintLogArgs(undefined), ["[poll-admin] firebase custom token mint failed"]);
  assert.deepEqual(tokenMintLogArgs("not-a-reason"), ["[poll-admin] firebase custom token mint failed"]);
});

describe("로그와 미설정 응답", { concurrency: false }, () => {
test("console.error에는 분류 인자만 전달한다", () => {
  const logs: unknown[][] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    logTokenMintFailure("key_import_failed", envWith(CANARY_ENV, CANARY_KEY));
    logTokenMintFailure("env_missing", { [POLL_FIREBASE_PRIVATE_KEY_ENV]: CANARY_ENV } as unknown as NodeJS.ProcessEnv);
    logTokenMintFailure(CANARY_EXCEPTION, envWith(CANARY_ENV, CANARY_KEY));
  } finally {
    console.error = orig;
  }
  assert.deepEqual(logs, [
    ["key_import_failed"],
    ["env_missing", POLL_FIREBASE_CLIENT_EMAIL_ENV],
    ["[poll-admin] firebase custom token mint failed"],
  ]);
  assertClean(JSON.stringify(logs), [CANARY_ENV, CANARY_KEY, CANARY_EXCEPTION, EMAIL]);
});

test("설정이 없으면 응답은 not_configured이고 로그는 비어 있는 변수 이름만", async () => {
  const saved = {
    email: process.env[POLL_FIREBASE_CLIENT_EMAIL_ENV],
    key: process.env[POLL_FIREBASE_PRIVATE_KEY_ENV],
  };
  const logs: unknown[][] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    process.env[POLL_FIREBASE_CLIENT_EMAIL_ENV] = CANARY_ENV;
    delete process.env[POLL_FIREBASE_PRIVATE_KEY_ENV];
    const response = await POST(
      new Request("https://shell.example/api/poll/firebase-token", {
        method: "POST",
        headers: { origin: "https://dcc.leessosso.uk", "content-type": "application/json" },
        body: JSON.stringify({ code: CANARY_EXCEPTION, audience: POLL_ADMIN_AUDIENCE }),
      }),
    );
    const text = await response.text();
    assert.equal(response.status, 500);
    assert.equal(text, JSON.stringify({ error: "not_configured" }));
    assert.deepEqual(logs, [["env_missing", POLL_FIREBASE_PRIVATE_KEY_ENV]]);
    assertClean(text + JSON.stringify(logs), [CANARY_ENV, CANARY_EXCEPTION]);
  } finally {
    console.error = orig;
    if (saved.email === undefined) delete process.env[POLL_FIREBASE_CLIENT_EMAIL_ENV];
    else process.env[POLL_FIREBASE_CLIENT_EMAIL_ENV] = saved.email;
    if (saved.key === undefined) delete process.env[POLL_FIREBASE_PRIVATE_KEY_ENV];
    else process.env[POLL_FIREBASE_PRIVATE_KEY_ENV] = saved.key;
  }
});
});
