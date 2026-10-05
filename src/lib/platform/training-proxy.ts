/**
 * 훈련(class-management) same-domain 프록시 설정.
 * next.config.ts rewrites와 문서에서 동일한 env 이름을 씁니다.
 */

export const TRAINING_PATH_PREFIX = "/training";

/** Vercel / 로컬에서 class-management 배포 URL (trailing slash 없음). */
export const TRAINING_ORIGIN_ENV = "TRAINING_ORIGIN";

/** 하위 호환·다른 팀 명칭용 alias */
export const CLASS_MANAGEMENT_URL_ENV = "CLASS_MANAGEMENT_URL";

export const DEFAULT_TRAINING_ORIGIN =
  "https://class-management-chi-amber.vercel.app";

/** Next.js basePath `/training` 루트 페이지 RSC flight 파일명 (`/training/training.rsc`). */
export const TRAINING_ROOT_RSC_SEGMENT = "training.rsc";

/**
 * rewrite 대상 origin. env 미설정 시 프로덕션 기본 URL(라이브 class-management).
 * 로컬에서 프록시를 끄려면 `TRAINING_ORIGIN=` 빈 값으로 두면 next.config에서 rewrite를 생략할 수 있음.
 */
export function resolveTrainingOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw =
    env[TRAINING_ORIGIN_ENV]?.trim() ||
    env[CLASS_MANAGEMENT_URL_ENV]?.trim();
  if (raw === "") return null;
  if (raw) return normalizeTrainingOrigin(raw);
  if (env.NODE_ENV === "production") {
    return DEFAULT_TRAINING_ORIGIN;
  }
  return null;
}

/** origin에 path(`/training`)가 붙어 있으면 제거해 이중 prefix rewrite를 막습니다. */
export function normalizeTrainingOrigin(origin: string): string {
  let normalized = origin.replace(/\/$/, "");
  if (normalized.endsWith(TRAINING_PATH_PREFIX)) {
    normalized = normalized.slice(0, -TRAINING_PATH_PREFIX.length);
  }
  return normalized;
}

/**
 * 셸 pathname이 훈련 zone(문서·자산·RSC flight)인지.
 * auth gate는 유지하되, `/training.rsc` 등 flight는 통독과 같이 공개 path로 취급하지 않고
 * rewrite/middleware 프록시만 적용한다 (HTML `/training`은 기존처럼 로그인 필요).
 */
export function isTrainingZonePath(pathname: string): boolean {
  if (pathname === TRAINING_PATH_PREFIX) return true;
  if (pathname.startsWith(`${TRAINING_PATH_PREFIX}/`)) return true;
  if (pathname.startsWith(`${TRAINING_PATH_PREFIX}.`)) return true;
  return false;
}

export type TrainingRewriteRule = { source: string; destination: string };

/**
 * class-management `basePath: '/training'` 배포용 shell rewrite 규칙.
 * `beforeFiles`에 넣어 셸이 `/training.rsc`를 자체 RSC로 처리하지 않게 합니다.
 */
export function trainingRewriteRules(origin: string): TrainingRewriteRule[] {
  const base = normalizeTrainingOrigin(origin);
  const upstream = (path: string) => `${base}${path}`;

  return [
    {
      source: `${TRAINING_PATH_PREFIX}.rsc`,
      destination: upstream(`${TRAINING_PATH_PREFIX}.rsc`),
    },
    {
      source: TRAINING_PATH_PREFIX,
      destination: upstream(TRAINING_PATH_PREFIX),
    },
    {
      source: `${TRAINING_PATH_PREFIX}/:path*`,
      destination: upstream(`${TRAINING_PATH_PREFIX}/:path*`),
    },
  ];
}

/**
 * class-management `basePath: '/training'` 배포 후 shell rewrite destination.
 * @deprecated {@link trainingRewriteRules} 사용. 하위 호환용 단일 destination.
 */
export function trainingRewriteDestination(origin: string): string {
  return `${normalizeTrainingOrigin(origin)}${TRAINING_PATH_PREFIX}`;
}
