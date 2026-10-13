/**
 * 로그인 잠금 정책 (순수 함수). 식별자(이름·전화번호)마다 10분 안에 5번 틀리면 10분 잠근다.
 * 성공하면 기록을 지운다.
 */
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_FAILURE_WINDOW_MS = 10 * 60 * 1000;
export const LOGIN_LOCK_MS = 10 * 60 * 1000;

export type ThrottleState = {
  failures: number;
  /** 이번 창(window)의 첫 실패 시각 (epoch ms) */
  windowStartedAt: number;
  /** 잠금 해제 시각 (epoch ms). 0이면 잠금 없음 */
  lockedUntil: number;
};

export const EMPTY_THROTTLE: ThrottleState = { failures: 0, windowStartedAt: 0, lockedUntil: 0 };

export function isLocked(state: ThrottleState | null | undefined, now: number): boolean {
  return !!state && state.lockedUntil > now;
}

export function afterFailure(state: ThrottleState | null | undefined, now: number): ThrottleState {
  const prev = state ?? EMPTY_THROTTLE;
  if (isLocked(prev, now)) return prev;
  const inWindow = prev.windowStartedAt > 0 && now - prev.windowStartedAt < LOGIN_FAILURE_WINDOW_MS;
  const failures = (inWindow ? prev.failures : 0) + 1;
  const windowStartedAt = inWindow ? prev.windowStartedAt : now;
  if (failures >= LOGIN_MAX_FAILURES) {
    return { failures: 0, windowStartedAt: 0, lockedUntil: now + LOGIN_LOCK_MS };
  }
  return { failures, windowStartedAt, lockedUntil: 0 };
}

/** 식별자 정규화: 앞뒤 공백 제거, 전화번호처럼 보이면 숫자만. 대소문자는 이름 접미사(김태희A)라 유지. */
export function throttleIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 9 && /^[\d\s+()-]+$/.test(trimmed)) return `phone:${digits}`;
  return `name:${trimmed}`;
}
