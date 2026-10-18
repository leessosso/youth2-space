import { pastoralMessagesCol, pastoralThreadsCol, withId } from "@/lib/store/collections";
import type { PastoralMessage, PastoralThread } from "@/lib/types";

/** 가족(groupId)당 돌봄카드는 하나. 없으면 만들지 않고 null을 돌려준다 (읽기 전용 목록용). */
export async function getThreadByGroup(groupId: string): Promise<PastoralThread | null> {
  const snap = await pastoralThreadsCol.where("groupId", "==", groupId).limit(1).get();
  if (snap.empty) return null;
  return withId(snap.docs[0]);
}

export async function getOrCreateThreadByGroup(groupId: string): Promise<PastoralThread> {
  const existing = await getThreadByGroup(groupId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const ref = pastoralThreadsCol.doc();
  const thread: Omit<PastoralThread, "id"> = { groupId, createdAt: now, updatedAt: now };
  await ref.set(thread);
  return { id: ref.id, ...thread };
}

export async function listMessagesByThread(threadId: string): Promise<PastoralMessage[]> {
  const snap = await pastoralMessagesCol.where("threadId", "==", threadId).get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getLatestMessageByGroup(groupId: string): Promise<PastoralMessage | null> {
  const thread = await getThreadByGroup(groupId);
  if (!thread) return null;
  const messages = await listMessagesByThread(thread.id);
  return messages.at(-1) ?? null;
}

/** 가족 목록용: 방·최근 글을 함께 가져온다. 방이 없으면 둘 다 null. */
export async function getThreadSummaryByGroup(
  groupId: string,
): Promise<{ thread: PastoralThread | null; latest: PastoralMessage | null }> {
  const thread = await getThreadByGroup(groupId);
  if (!thread) return { thread: null, latest: null };
  const messages = await listMessagesByThread(thread.id);
  return { thread, latest: messages.at(-1) ?? null };
}

/** 목사·관리자가 가족 방을 열 때 그 사용자의 읽음 시각을 기록한다. */
export async function markThreadReadByUser(threadId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await pastoralThreadsCol.doc(threadId).update({ [`readAtByUser.${userId}`]: now });
}

export async function sendFamilyMessage(params: {
  groupId: string;
  authorId: string;
  body: string;
  aboutMemberId?: string | null;
}): Promise<PastoralMessage> {
  const thread = await getOrCreateThreadByGroup(params.groupId);
  const now = new Date().toISOString();
  const ref = pastoralMessagesCol.doc();
  const message: Omit<PastoralMessage, "id"> = {
    threadId: thread.id,
    authorId: params.authorId,
    body: params.body,
    aboutMemberId: params.aboutMemberId ?? null,
    createdAt: now,
  };
  await ref.set(message);
  await pastoralThreadsCol.doc(thread.id).update({ updatedAt: now });
  return { id: ref.id, ...message };
}

export async function countThreadsWithMessages(groupIds: string[]): Promise<number> {
  let count = 0;
  await Promise.all(
    groupIds.map(async (groupId) => {
      const latest = await getLatestMessageByGroup(groupId);
      if (latest) count += 1;
    }),
  );
  return count;
}
