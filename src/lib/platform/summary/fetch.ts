import { resolveTongdokOrigin } from "@/lib/platform/tongdok-proxy";
import { resolveTrainingOrigin } from "@/lib/platform/training-proxy";
import {
  parseTongdokSummary,
  parseTrainingSummary,
  type SummaryApp,
  type TongdokSummary,
  type TrainingSummary,
} from "@/lib/platform/summary/schema";
import { mintSummaryToken } from "@/lib/platform/summary/token";

/** 서버 전용. 브라우저 번들에 들어가지 않도록 클라이언트 컴포넌트에서 import하지 않는다. */

/** 앱 함수 콜드 스타트(1~2초+)를 견딜 만큼. 대시보드는 Suspense로 기다리지 않는다. */
export const SUMMARY_TIMEOUT_MS = 3000;
export const SUMMARY_CACHE_MS = 45_000;
/** 호출이 실패하면 이 시간 안의 마지막 성공 응답을 대신 보여 준다(stale-while-error). */
export const SUMMARY_STALE_MS = 10 * 60_000;

export const SUMMARY_PATH: Record<SummaryApp, string> = {
  "class-management": "/training/api/platform/summary",
  tongdok: "/tongdok/api/platform/summary",
};

export type AppSummaries = { training: TrainingSummary | null; tongdok: TongdokSummary | null };

export type SummaryDeps = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
};

/** 플래그(`PLATFORM_SUMMARY_ENABLED=true`)와 키가 모두 있어야 켜진다. 기본은 꺼짐. */
export function summaryConfig(env: NodeJS.ProcessEnv = process.env) {
  const enabled = env.PLATFORM_SUMMARY_ENABLED?.trim().toLowerCase() === "true";
  const secret = env.PLATFORM_SUMMARY_SECRET?.trim() ?? "";
  if (!enabled || !secret) return null;
  return {
    secret,
    origins: {
      "class-management": resolveTrainingOrigin(env),
      tongdok: resolveTongdokOrigin(env),
    } as Record<SummaryApp, string | null>,
  };
}

/** sub별 성공 응답만 잠깐 캐시한다(사용자 간 공유 없음, 실패는 캐시하지 않음). */
const cache = new Map<string, { at: number; value: unknown }>();

export function clearSummaryCache() {
  cache.clear();
}

async function fetchOne(
  app: SummaryApp,
  sub: string,
  origin: string | null,
  secret: string,
  deps: Required<Pick<SummaryDeps, "fetchImpl" | "now" | "timeoutMs">>,
): Promise<unknown | null> {
  if (!origin) return null;
  const key = `${app}:${sub}`;
  const hit = cache.get(key);
  if (hit && deps.now() - hit.at < SUMMARY_CACHE_MS) return hit.value;

  const started = deps.now();
  const stale = () => {
    if (hit && deps.now() - hit.at < SUMMARY_STALE_MS) return hit.value;
    return null;
  };
  const done = (outcome: string, status: number | null, value: unknown | null) => {
    // sub·토큰은 남기지 않는다.
    console.info(
      `[platform-summary] app=${app} outcome=${outcome} status=${status ?? "-"} ms=${deps.now() - started}`,
    );
    return value;
  };

  let status: number | null = null;
  try {
    const token = await mintSummaryToken(app, sub, secret, Math.floor(deps.now() / 1000));
    const res = await deps.fetchImpl(new URL(SUMMARY_PATH[app], origin), {
      method: "GET",
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(deps.timeoutMs),
    });
    status = res.status;
    if (res.status !== 200) {
      const v = stale();
      return done(v ? "stale" : "http_error", status, v);
    }
    const value: unknown = await res.json();
    cache.set(key, { at: deps.now(), value });
    if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
    return done("ok", status, value);
  } catch (error) {
    // 타임아웃·네트워크·JSON 오류: 최근 성공 응답이 있으면 그것, 없으면 카드 숨김(바로가기만)
    const reason =
      error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
        ? "timeout"
        : "error";
    const v = stale();
    return done(v ? `stale_${reason}` : reason, status, v);
  }
}

/** 두 앱을 병렬로 부른다. 어떤 실패든 해당 앱은 null. 절대 throw하지 않는다. */
export async function fetchAppSummaries(sub: string, deps: SummaryDeps = {}): Promise<AppSummaries> {
  const config = summaryConfig(deps.env ?? process.env);
  if (!config || !sub) return { training: null, tongdok: null };
  const d = {
    fetchImpl: deps.fetchImpl ?? fetch,
    now: deps.now ?? Date.now,
    timeoutMs: deps.timeoutMs ?? SUMMARY_TIMEOUT_MS,
  };
  const [training, tongdok] = await Promise.all([
    fetchOne("class-management", sub, config.origins["class-management"], config.secret, d),
    fetchOne("tongdok", sub, config.origins.tongdok, config.secret, d),
  ]);
  return { training: parseTrainingSummary(training), tongdok: parseTongdokSummary(tongdok) };
}
