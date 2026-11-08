import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import { membersCol } from "@/lib/store/collections";
import { getUserById } from "@/lib/store/users";
import { readPollServiceAccount, signFirebaseCustomToken } from "@/lib/platform/poll-admin/custom-token";
import { PollTokenMintError } from "@/lib/platform/poll-admin/token-mint-diagnostic";
import {
  POLL_ADMIN_CODES_COLLECTION,
  generatePollAdminCode,
  hashPollAdminCode,
  newPollAdminCodeRecord,
  type PollAdminCodeRecord,
  type PollAdminSubject,
} from "@/lib/platform/poll-admin/contract";

/**
 * dcc-poll 프로젝트 서비스 계정(셸 서버 env에만).
 * POLL_FIREBASE_CLIENT_EMAIL, POLL_FIREBASE_PRIVATE_KEY. (POLL_FIREBASE_PROJECT_ID는 문서용, 토큰 서명에는 쓰지 않음)
 */
export function isPollFirebaseConfigured(): boolean {
  return readPollServiceAccount() !== null;
}

export async function mintPollCustomToken(
  uid: string,
  claims: { admin: true; mid: string },
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const account = readPollServiceAccount(env);
  if (!account) throw new PollTokenMintError("env_missing");
  return signFirebaseCustomToken(account, uid, claims);
}

/** users.id → 셸 회원 id(mid). 연결된 members 문서가 정확히 하나일 때만. */
export async function resolveMidForUser(userId: string): Promise<string | null> {
  const snap = await membersCol.where("userId", "==", userId).limit(2).get();
  if (snap.size !== 1) return null;
  return snap.docs[0].id;
}

export async function currentShellUser(userId: string): Promise<PollAdminSubject | null> {
  const user = await getUserById(userId);
  return user ? { role: user.role, officerTitle: user.officerTitle } : null;
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
