import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { decodeJwt, decodeProtectedHeader, jwtVerify } from "jose";
import { clearSummaryCache, fetchAppSummaries, SUMMARY_PATH, summaryConfig } from "../src/lib/platform/summary/fetch";
import { parseTongdokSummary, parseTrainingSummary, tongdokLine, trainingLine } from "../src/lib/platform/summary/schema";
import { mintSummaryToken, SUMMARY_AUDIENCE } from "../src/lib/platform/summary/token";

const SECRET = "test-summary-secret-0123456789abcdef";
const key = new TextEncoder().encode(SECRET);
const ENV = {
  NODE_ENV: "test",
  PLATFORM_SUMMARY_ENABLED: "true",
  PLATFORM_SUMMARY_SECRET: SECRET,
  TRAINING_ORIGIN: "https://cm.example",
  TONGDOK_ORIGIN: "https://td.example",
} as unknown as NodeJS.ProcessEnv;

/** 타임아웃까지 응답하지 않는 fetch. AbortSignal.timeout 타이머는 unref라 이벤트 루프를 붙잡아 둔다. */
function hang(signal?: AbortSignal | null): Promise<Response> {
  return new Promise((_, reject) => {
    const keep = setTimeout(() => {}, 10_000);
    signal?.addEventListener("abort", () => {
      clearTimeout(keep);
      reject(signal.reason);
    });
  });
}

const TRAINING_OK = {
  version: 1,
  app: "class-management",
  linked: true,
  generatedAt: "2026-10-13T00:00:00Z",
  extra: "ignored",
  programs: [
    {
      id: "p1",
      name: "제자훈련 2기",
      status: "active",
      myRole: "trainee",
      attendance: { attended: 6, total: 8, rate: 0.75, recentAbsence: false },
      nextSession: { date: "2026-10-18", round: 9 },
      assignments: { pendingCount: 1, thisWeekDone: false },
      unknownField: { x: 1 },
    },
  ],
};
const TONGDOK_OK = {
  version: 1,
  app: "tongdok",
  linked: true,
  generatedAt: "2026-10-13T00:00:00Z",
  cohorts: [
    {
      slug: "2026-fall",
      title: "2026 가을 통독",
      today: { dayId: "w5d2", date: "2026-10-13", label: "창세기 12–15장", done: false, skipped: false },
      progress: { done: 21, required: 23, percent: 91.3, behindDays: 2 },
    },
  ],
};

beforeEach(() => clearSummaryCache());

test("토큰 클레임: iss·aud·typ·sub·jti, exp=iat+60, HS256", async () => {
  const now = 1_800_000_000;
  const token = await mintSummaryToken("class-management", "user-1", SECRET, now);
  assert.equal(decodeProtectedHeader(token).alg, "HS256");
  const { payload } = await jwtVerify(token, key, {
    issuer: "youth2-space",
    audience: "class-management-summary",
    currentDate: new Date(now * 1000),
  });
  assert.equal(payload.typ, "platform-summary");
  assert.equal(payload.sub, "user-1");
  assert.equal(payload.iat, now);
  assert.equal(payload.exp, now + 60);
  assert.match(String(payload.jti), /^[0-9a-f-]{36}$/);
});

test("토큰: 앱별 aud, 매번 새 jti, SSO aud로는 검증 실패", async () => {
  const a = await mintSummaryToken("tongdok", "u", SECRET);
  const b = await mintSummaryToken("tongdok", "u", SECRET);
  assert.equal(decodeJwt(a).aud, SUMMARY_AUDIENCE.tongdok);
  assert.notEqual(decodeJwt(a).jti, decodeJwt(b).jti);
  await assert.rejects(jwtVerify(a, key, { issuer: "youth2-space", audience: "tongdok" }));
});

test("플래그: 기본 꺼짐, 키 없으면 꺼짐", () => {
  assert.equal(summaryConfig({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv), null);
  assert.equal(summaryConfig({ ...ENV, PLATFORM_SUMMARY_SECRET: "" }), null);
  assert.equal(summaryConfig({ ...ENV, PLATFORM_SUMMARY_ENABLED: "1" }), null);
  assert.ok(summaryConfig(ENV));
});

test("플래그가 꺼져 있으면 fetch를 부르지 않는다", async () => {
  let calls = 0;
  const r = await fetchAppSummaries("u", {
    env: { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv,
    fetchImpl: (async () => {
      calls++;
      return new Response("{}");
    }) as typeof fetch,
  });
  assert.deepEqual(r, { training: null, tongdok: null });
  assert.equal(calls, 0);
});

test("정상: 두 앱 병렬 호출, Bearer·no-store, 모르는 필드 무시", async () => {
  const seen: { url: string; auth: string | null; cache: RequestCache | undefined }[] = [];
  const r = await fetchAppSummaries("u1", {
    env: ENV,
    fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      seen.push({ url, auth: new Headers(init?.headers).get("authorization"), cache: init?.cache });
      return Response.json(url.includes("/training/") ? TRAINING_OK : TONGDOK_OK);
    }) as typeof fetch,
  });
  assert.equal(seen.length, 2);
  assert.ok(seen.some((s) => s.url === `https://cm.example${SUMMARY_PATH["class-management"]}`));
  assert.ok(seen.some((s) => s.url === `https://td.example${SUMMARY_PATH.tongdok}`));
  assert.ok(seen.every((s) => s.auth?.startsWith("Bearer ") && s.cache === "no-store"));
  assert.equal(trainingLine(r.training!.programs[0]), "출석 6/8 · 다음 수업 10/18 · 미제출 과제 1");
  assert.equal(tongdokLine(r.tongdok!.cohorts[0]), "진도 91% · 오늘 창세기 12–15장");
});

test("폴백: 401·500·타임아웃·잘못된 JSON·throw는 해당 앱만 null", async () => {
  const cases: ((url: string, signal?: AbortSignal | null) => Promise<Response>)[] = [
    async () => new Response("{}", { status: 401 }),
    async () => new Response("oops", { status: 500 }),
    async () => new Response("not json", { status: 200 }),
    async () => {
      throw new Error("ECONNRESET");
    },
    (_url, signal) => hang(signal),
  ];
  for (const failing of cases) {
    clearSummaryCache();
    const r = await fetchAppSummaries("u2", {
      env: ENV,
      timeoutMs: 50,
      fetchImpl: (async (input: URL | RequestInfo, init?: RequestInit) => {
        const url = String(input);
        return url.includes("/training/") ? failing(url, init?.signal) : Response.json(TONGDOK_OK);
      }) as typeof fetch,
    });
    assert.equal(r.training, null);
    assert.ok(r.tongdok);
  }
});

test("폴백: linked:false, 다른 version, 빈 배열", () => {
  assert.equal(parseTrainingSummary({ version: 1, linked: false, programs: [] }), null);
  assert.equal(parseTrainingSummary({ ...TRAINING_OK, version: 2 }), null);
  assert.equal(parseTongdokSummary({ ...TONGDOK_OK, app: "class-management" }), null);
  assert.deepEqual(parseTongdokSummary({ ...TONGDOK_OK, cohorts: [] })?.cohorts, []);
});

test("캐시: 성공은 sub별 45초, 실패는 캐시 안 함, 사용자 간 공유 없음", async () => {
  let calls = 0;
  let t = 1_000_000;
  let fail = true;
  const deps = {
    env: { ...ENV, TONGDOK_ORIGIN: "" } as NodeJS.ProcessEnv,
    now: () => t,
    fetchImpl: (async () => {
      calls++;
      return fail ? new Response("", { status: 503 }) : Response.json(TRAINING_OK);
    }) as typeof fetch,
  };
  await fetchAppSummaries("a", deps);
  fail = false;
  await fetchAppSummaries("a", deps);
  await fetchAppSummaries("a", deps);
  assert.equal(calls, 2);
  await fetchAppSummaries("b", deps);
  assert.equal(calls, 3);
  t += 46_000;
  await fetchAppSummaries("a", deps);
  assert.equal(calls, 4);
});

test("stale-while-error: 실패 시 10분 안의 마지막 성공을 쓰고, 그 뒤엔 숨김", async () => {
  clearSummaryCache();
  let t = 5_000_000;
  let fail = false;
  const deps = {
    env: { ...ENV, TONGDOK_ORIGIN: "" } as NodeJS.ProcessEnv,
    now: () => t,
    timeoutMs: 50,
    fetchImpl: (async (_i: URL | RequestInfo, init?: RequestInit) =>
      fail ? hang(init?.signal) : Response.json(TRAINING_OK)) as typeof fetch,
  };
  assert.ok((await fetchAppSummaries("s", deps)).training);
  fail = true;
  t += 60_000;
  assert.ok((await fetchAppSummaries("s", deps)).training, "timeout -> stale");
  t += 10 * 60_000;
  assert.equal((await fetchAppSummaries("s", deps)).training, null);
});

test("기본 타임아웃은 3초", async () => {
  const { SUMMARY_TIMEOUT_MS } = await import("../src/lib/platform/summary/fetch");
  assert.equal(SUMMARY_TIMEOUT_MS, 3000);
});

test("홈 카드 날짜 정렬: 오늘·미래 가까운 순 → 지난 날짜 최근 순 → 날짜 없음(원래 순서)", async () => {
  const { orderByNearestDate, earliestDate } = await import("../src/lib/platform/home-order");
  const today = "2026-10-13";
  const out = orderByNearestDate(
    [
      { item: "admin", date: null },
      { item: "meeting", date: "2026-10-25" },
      { item: "pastA", date: "2026-10-01" },
      { item: "push", date: null },
      { item: "training", date: "2026-10-18" },
      { item: "pastB", date: "2026-10-11" },
      { item: "tongdok", date: today },
      { item: "attendance", date: today },
    ],
    today,
  );
  assert.deepEqual(out, ["tongdok", "attendance", "training", "meeting", "pastB", "pastA", "admin", "push"]);
  assert.equal(earliestDate(["2026-10-20", null, "2026-10-18", "bad"]), "2026-10-18");
  assert.equal(earliestDate([null, undefined]), null);
});
