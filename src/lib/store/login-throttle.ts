import { createHash } from "node:crypto";
import type { DocumentData } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import {
  EMPTY_THROTTLE,
  afterFailure,
  isLocked,
  throttleIdentifier,
  type ThrottleState,
} from "@/lib/login-throttle-policy";

/** Firestore `loginThrottle/{sha256(식별자)}`. 문서에는 해시만 두고 이름·번호 원문은 남기지 않는다. */
function throttleRef(identifier: string) {
  const key = createHash("sha256").update(throttleIdentifier(identifier)).digest("hex").slice(0, 40);
  return getDb().collection("loginThrottle").doc(key);
}

function readState(data: DocumentData | undefined): ThrottleState {
  if (!data) return EMPTY_THROTTLE;
  return {
    failures: Number(data.failures) || 0,
    windowStartedAt: Number(data.windowStartedAt) || 0,
    lockedUntil: Number(data.lockedUntil) || 0,
  };
}

export async function isLoginLocked(identifier: string): Promise<boolean> {
  const snap = await throttleRef(identifier).get();
  return isLocked(readState(snap.data()), Date.now());
}

export async function recordLoginFailure(identifier: string): Promise<void> {
  const ref = throttleRef(identifier);
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = afterFailure(readState(snap.data()), Date.now());
    tx.set(ref, { ...next, updatedAt: new Date().toISOString() });
  });
}

export async function clearLoginFailures(identifier: string): Promise<void> {
  await throttleRef(identifier).delete();
}
