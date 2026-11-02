import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@/lib/types";

/** docs/security-shell-admin.md(poll) 계약. 투표 앱 관리자 교환 전용 audience. */
export const POLL_ADMIN_AUDIENCE = "dcc-poll-admin" as const;
/** 일회용 code 수명(초). */
export const POLL_ADMIN_CODE_TTL_SECONDS = 60;
/** 투표 관리자 code를 담는 Firestore 컬렉션. 문서 id는 code의 sha256이라 원문은 저장하지 않는다. */
export const POLL_ADMIN_CODES_COLLECTION = "pollAdminCodes";

/** CORS·return_to를 허용하는 투표 오리진. 이 둘만 허용한다. */
export const POLL_ALLOWED_ORIGINS = [
  "https://dcc.leessosso.uk",
  "https://leessosso.github.io",
] as const;

/** 오리진별로 return_to에 허용하는 경로 접두사. */
const POLL_RETURN_PATH_PREFIX: Record<string, string> = {
  "https://dcc.leessosso.uk": "/poll/",
  "https://leessosso.github.io": "/poll",
};

/**
 * 투표 관리자 권한: 셸 ADMIN·PASTOR만.
 * LEADER(가장)·임원(officerTitle)은 셸에서도 앱 관리 권한이 없으므로 제외한다.
 */
export function canAdministerPoll(role: Role | null | undefined): boolean {
  return role === "ADMIN" || role === "PASTOR";
}

/** 128비트보다 넉넉한 256비트 랜덤, base64url(URL·프래그먼트 안전). */
export function generatePollAdminCode(): string {
  return randomBytes(32).toString("base64url");
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedPollAdminCode(code: unknown): code is string {
  return typeof code === "string" && CODE_PATTERN.test(code);
}

export function hashPollAdminCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function isAllowedPollOrigin(origin: string | null | undefined): boolean {
  return Boolean(origin) && (POLL_ALLOWED_ORIGINS as readonly string[]).includes(origin!);
}

/** return_to가 허용된 투표 오리진·경로이면 정규화한 URL(프래그먼트 제거)을, 아니면 null. */
export function parsePollReturnTo(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const prefix = POLL_RETURN_PATH_PREFIX[url.origin];
  if (!prefix || !url.pathname.startsWith(prefix)) return null;
  url.hash = "";
  return url;
}

/** 코드는 쿼리가 아니라 프래그먼트에 싣는다(서버 로그·Referer 방지). */
export function pollReturnUrlWithCode(returnTo: URL, code: string): string {
  const url = new URL(returnTo.toString());
  url.hash = `code=${code}`;
  return url.toString();
}

export type PollAdminCodeRecord = {
  mid: string;
  userId: string;
  audience: string;
  /** epoch ms */
  issuedAt: number;
  /** epoch ms */
  expiresAt: number;
};

export function newPollAdminCodeRecord(
  mid: string,
  userId: string,
  now = Date.now(),
): PollAdminCodeRecord {
  return {
    mid,
    userId,
    audience: POLL_ADMIN_AUDIENCE,
    issuedAt: now,
    expiresAt: now + POLL_ADMIN_CODE_TTL_SECONDS * 1000,
  };
}

/** Firebase 커스텀 토큰 클레임. 계약상 이 두 개만. admin은 boolean true. */
export function pollAdminClaims(mid: string): { admin: true; mid: string } {
  return { admin: true, mid };
}

/** dcc-poll Firebase uid. 셸 회원 id 기반으로 고정한다. */
export function pollAdminUid(mid: string): string {
  return `shell_${mid}`;
}

export type ExchangeInput = {
  body: unknown;
  /** 세션 쿠키가 실려 왔으면 셸 users.id, 없으면 null */
  sessionUserId: string | null;
};

export type ExchangeDeps = {
  /** code 해시로 기록을 꺼내고 같은 트랜잭션에서 지운다(있든 없든 1회용). */
  consume(codeHash: string): Promise<PollAdminCodeRecord | null>;
  /** 교환 시점의 셸 역할(강등 반영). 사용자가 없으면 null */
  currentRole(userId: string): Promise<Role | null>;
  mintToken(uid: string, claims: { admin: true; mid: string }): Promise<string>;
  now?: () => number;
};

export type ExchangeResult =
  | { status: 200; body: { firebaseToken: string } }
  | { status: 400 | 401 | 403 | 410 | 500; body: { error: string } };

export async function exchangePollAdminCode(
  input: ExchangeInput,
  deps: ExchangeDeps,
): Promise<ExchangeResult> {
  const body = (input.body ?? {}) as { code?: unknown; audience?: unknown };
  if (body.audience !== POLL_ADMIN_AUDIENCE) {
    return { status: 400, body: { error: "invalid_audience" } };
  }
  if (!isWellFormedPollAdminCode(body.code)) {
    return { status: 400, body: { error: "invalid_code" } };
  }

  const record = await deps.consume(hashPollAdminCode(body.code));
  const now = (deps.now ?? Date.now)();
  if (!record || record.expiresAt <= now) {
    return { status: 410, body: { error: "code_expired_or_used" } };
  }
  if (record.audience !== POLL_ADMIN_AUDIENCE) {
    return { status: 400, body: { error: "invalid_audience" } };
  }
  if (input.sessionUserId && input.sessionUserId !== record.userId) {
    return { status: 403, body: { error: "session_mismatch" } };
  }

  const role = await deps.currentRole(record.userId);
  if (!role) return { status: 401, body: { error: "unauthenticated" } };
  if (!canAdministerPoll(role)) return { status: 403, body: { error: "forbidden" } };

  try {
    const firebaseToken = await deps.mintToken(pollAdminUid(record.mid), pollAdminClaims(record.mid));
    return { status: 200, body: { firebaseToken } };
  } catch {
    return { status: 500, body: { error: "token_mint_failed" } };
  }
}
