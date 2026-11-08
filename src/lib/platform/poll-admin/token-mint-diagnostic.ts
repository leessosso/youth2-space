/**
 * Firebase 커스텀 토큰 발급 실패를 고정 분류로만 남긴다.
 * 개인키·코드·토큰·예외 원문·이메일 전체는 로그와 응답에 넣지 않는다.
 *
 * 리터럴 \n → 실제 줄바꿈 치환은 custom-token.ts의 normalizePrivateKey가 이미 한 번 한다.
 * 이 모듈은 그 결과를 더 고치지 않고, 치환 뒤에도 이스케이프가 남아 있으면 key_escaped_newlines로만 본다.
 */

export const POLL_FIREBASE_CLIENT_EMAIL_ENV = "POLL_FIREBASE_CLIENT_EMAIL";
export const POLL_FIREBASE_PRIVATE_KEY_ENV = "POLL_FIREBASE_PRIVATE_KEY";

export const POLL_TOKEN_MINT_REASONS = [
  "env_missing",
  "key_not_pem",
  "key_escaped_newlines",
  "key_wrapped_quotes",
  "key_not_pkcs8",
  "key_import_failed",
  "client_email_invalid",
  "sign_failed",
] as const;

export type PollTokenMintReason = (typeof POLL_TOKEN_MINT_REASONS)[number];

const REASON_SET: ReadonlySet<string> = new Set(POLL_TOKEN_MINT_REASONS);

export function isPollTokenMintReason(value: string | undefined): value is PollTokenMintReason {
  return typeof value === "string" && REASON_SET.has(value);
}

/** 메시지·reason은 분류 코드만. cause에 원본 예외를 담지 않는다. */
export class PollTokenMintError extends Error {
  readonly reason: PollTokenMintReason;

  constructor(reason: PollTokenMintReason) {
    super(reason);
    this.name = "PollTokenMintError";
    this.reason = reason;
  }
}

export function isPollTokenMintError(err: unknown): err is PollTokenMintError {
  return err instanceof PollTokenMintError;
}

export function missingPollFirebaseEnvNames(
  env: NodeJS.ProcessEnv = process.env,
): Array<typeof POLL_FIREBASE_CLIENT_EMAIL_ENV | typeof POLL_FIREBASE_PRIVATE_KEY_ENV> {
  const missing: Array<typeof POLL_FIREBASE_CLIENT_EMAIL_ENV | typeof POLL_FIREBASE_PRIVATE_KEY_ENV> = [];
  if (!env[POLL_FIREBASE_CLIENT_EMAIL_ENV]?.trim()) missing.push(POLL_FIREBASE_CLIENT_EMAIL_ENV);
  if (!env[POLL_FIREBASE_PRIVATE_KEY_ENV]?.trim()) missing.push(POLL_FIREBASE_PRIVATE_KEY_ENV);
  return missing;
}

type ServiceAccountMaterial = { clientEmail: string; privateKey: string };

const CLIENT_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PKCS8_LABEL = "PRIVATE KEY";

/**
 * 서명에 넘길 재료의 구조 문제. 없으면 null이고, 그때만 기존 importPKCS8·SignJWT로 간다.
 * 우선순위: 따옴표 감쌈 → 남은 이스케이프 개행 → PEM 아님 → PKCS#8 아님 → 이메일 형식.
 */
export function classifyPollServiceAccount(account: ServiceAccountMaterial): PollTokenMintReason | null {
  const key = account.privateKey.trim();
  if (isWrappedInQuotes(key)) return "key_wrapped_quotes";
  if (hasEscapedNewlines(key)) return "key_escaped_newlines";
  const label = pemLabel(key);
  if (!label) return "key_not_pem";
  if (label !== PKCS8_LABEL) return "key_not_pkcs8";
  if (!isPlausibleClientEmail(account.clientEmail.trim())) return "client_email_invalid";
  return null;
}

function isWrappedInQuotes(value: string): boolean {
  if (value.length < 2) return false;
  const open = value[0];
  const close = value[value.length - 1];
  return (open === '"' && close === '"') || (open === "'" && close === "'");
}

/** 실제 줄바꿈이 아니라 문자 그대로 남은 `\n`, 또는 한 번만 풀리고 백슬래시가 남은 개행. */
function hasEscapedNewlines(value: string): boolean {
  return /\\(?:n|\r?\n)/.test(value);
}

function pemLabel(value: string): string | null {
  const begin = /-----BEGIN ([A-Z0-9 ]+)-----/.exec(value);
  const end = /-----END ([A-Z0-9 ]+)-----/.exec(value);
  if (!begin || !end || begin[1] !== end[1]) return null;
  return begin[1];
}

function isPlausibleClientEmail(email: string): boolean {
  return email.length <= 254 && CLIENT_EMAIL_PATTERN.test(email);
}

const FALLBACK_LOG = "[poll-admin] firebase custom token mint failed";

/** console.error에 넘길 인자. 분류 코드만, env_missing이면 비어 있는 변수 이름만 뒤에 붙인다. */
export function tokenMintLogArgs(reason: string | undefined, env: NodeJS.ProcessEnv = process.env): string[] {
  if (reason === "env_missing") return ["env_missing", ...missingPollFirebaseEnvNames(env)];
  if (isPollTokenMintReason(reason)) return [reason];
  return [FALLBACK_LOG];
}

export function logTokenMintFailure(reason: string | undefined, env: NodeJS.ProcessEnv = process.env): void {
  console.error(...tokenMintLogArgs(reason, env));
}
