import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { membersCol } from "@/lib/store/collections";
import { getUserById } from "@/lib/store/users";
import type { Role } from "@/lib/types";
import {
  POLL_ADMIN_CODES_COLLECTION,
  generatePollAdminCode,
  hashPollAdminCode,
  newPollAdminCodeRecord,
  type PollAdminCodeRecord,
} from "@/lib/platform/poll-admin/contract";

const POLL_APP_NAME = "dcc-poll";

/**
 * dcc-poll 프로젝트 서비스 계정(셸 서버 env에만).
 * POLL_FIREBASE_PROJECT_ID(기본 dcc-poll), POLL_FIREBASE_CLIENT_EMAIL, POLL_FIREBASE_PRIVATE_KEY.
 */
export function isPollFirebaseConfigured(): boolean {
  return Boolean(
    process.env.POLL_FIREBASE_CLIENT_EMAIL?.trim() && process.env.POLL_FIREBASE_PRIVATE_KEY?.trim(),
  );
}

function pollApp(): App {
  if (getApps().some((a) => a.name === POLL_APP_NAME)) return getApp(POLL_APP_NAME);
  const projectId = process.env.POLL_FIREBASE_PROJECT_ID?.trim() || "dcc-poll";
  const clientEmail = process.env.POLL_FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.POLL_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("POLL_FIREBASE_* is not configured");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, POLL_APP_NAME);
}

export async function mintPollCustomToken(
  uid: string,
  claims: { admin: true; mid: string },
): Promise<string> {
  return getAuth(pollApp()).createCustomToken(uid, claims);
}

/** users.id → 셸 회원 id(mid). 연결된 members 문서가 정확히 하나일 때만. */
export async function resolveMidForUser(userId: string): Promise<string | null> {
  const snap = await membersCol.where("userId", "==", userId).limit(2).get();
  if (snap.size !== 1) return null;
  return snap.docs[0].id;
}

export async function currentShellRole(userId: string): Promise<Role | null> {
  const user = await getUserById(userId);
  return user?.role ?? null;
}

export async function issuePollAdminCode(mid: string, userId: string): Promise<string> {
  const code = generatePollAdminCode();
  const record = newPollAdminCodeRecord(mid, userId);
  await getDb()
    .collection(POLL_ADMIN_CODES_COLLECTION)
    .doc(hashPollAdminCode(code))
    .create({ ...record, createdAt: FieldValue.serverTimestamp() });
  return code;
}

export async function consumePollAdminCode(codeHash: string): Promise<PollAdminCodeRecord | null> {
  const db = getDb();
  const ref = db.collection(POLL_ADMIN_CODES_COLLECTION).doc(codeHash);
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return null;
    tx.delete(ref);
    const d = doc.data() as PollAdminCodeRecord;
    return { mid: d.mid, userId: d.userId, audience: d.audience, issuedAt: d.issuedAt, expiresAt: d.expiresAt };
  });
}
