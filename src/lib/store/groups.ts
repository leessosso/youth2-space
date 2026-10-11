import { cache } from "react";
import {
  groupLeaderTermsCol,
  groupsCol,
  membersCol,
  withId,
} from "@/lib/store/collections";
import { getCurrentTerm } from "@/lib/store/settings";
import { getUserById, getUsersByIds } from "@/lib/store/users";
import { sameTerm, type Term } from "@/lib/term";
import type { Group, GroupLeaderTerm, Member } from "@/lib/types";

function groupTerm(group: Group): Term {
  return { year: group.year, half: group.half };
}

export const listAllGroups = cache(async (): Promise<Group[]> => {
  const snap = await groupsCol.get();
  return snap.docs.map(withId).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.half !== b.half) return a.half === "H2" ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });
});

/** 현재 상/하반기에 구성된 가족만 */
export async function listGroups(): Promise<Group[]> {
  const term = await getCurrentTerm();
  return (await listAllGroups()).filter((g) => sameTerm(groupTerm(g), term));
}

export async function getGroupById(id: string): Promise<Group | null> {
  const doc = await groupsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function getGroupByCurrentLeader(leaderId: string): Promise<Group | null> {
  const term = await getCurrentTerm();
  const snap = await groupsCol.where("currentLeaderId", "==", leaderId).get();
  const groups = snap.docs.map(withId);
  return groups.find((g) => sameTerm(groupTerm(g), term)) ?? null;
}

/** 이번 학기 담당 가족이 있는 가장(LEADER) 사용자 id. 출석 리마인더 수신 대상. */
export async function listCurrentLeaderUserIds(): Promise<string[]> {
  const groups = await listGroups();
  const leaderIds = [
    ...new Set(groups.map((g) => g.currentLeaderId).filter((id): id is string => Boolean(id))),
  ];
  if (leaderIds.length === 0) return [];

  const users = await getUsersByIds(leaderIds);
  return leaderIds.filter((id) => users.get(id)?.role === "LEADER");
}

function asMember(id: string, data: Partial<Omit<Member, "id">> | undefined): Member {
  return {
    id,
    groupId: data?.groupId ?? "",
    name: data?.name ?? "",
    phone: data?.phone ?? null,
    createdAt: data?.createdAt ?? "",
    userId: data?.userId ?? null,
  };
}

async function queryMembersByGroup(groupId: string): Promise<Member[]> {
  const snap = await membersCol.where("groupId", "==", groupId).get();
  return snap.docs
    .map((doc) => asMember(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 이번 학기 가장은 그 가족 가족원이어야 출석·조사 명단에 본인이 나온다.
 * 성도 기록이 다른 가족에 있거나 없으면, 명단을 읽기 전에 이 가족으로 맞춘다.
 * 지난 학기 가족은 건드리지 않는다.
 */
async function ensureCurrentLeaderIsMember(groupId: string): Promise<void> {
  const group = await getGroupById(groupId);
  if (!group?.currentLeaderId) return;
  const term = await getCurrentTerm();
  if (!sameTerm(groupTerm(group), term)) return;

  const members = await queryMembersByGroup(groupId);
  if (members.some((member) => member.userId === group.currentLeaderId)) return;

  const user = await getUserById(group.currentLeaderId);
  const name = user?.name?.trim();
  if (!user || !name) return;

  const sameName = members.find((member) => member.name.trim() === name && !member.userId);
  if (sameName) {
    await linkMemberUser(sameName.id, user.id);
    return;
  }

  const linked = await getMemberByUserId(group.currentLeaderId);
  if (linked) {
    if (linked.groupId !== groupId) await assignMemberToGroup(linked.id, groupId);
    return;
  }

  const created = await createMember(groupId, name, user.phone);
  await linkMemberUser(created.id, user.id);
}

export async function listMembersByGroup(groupId: string): Promise<Member[]> {
  await ensureCurrentLeaderIsMember(groupId);
  return queryMembersByGroup(groupId);
}

export const listAllMembers = cache(async (): Promise<Member[]> => {
  const snap = await membersCol.get();
  return snap.docs
    .map((doc) => asMember(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
});

export async function getMemberById(id: string): Promise<Member | null> {
  const doc = await membersCol.doc(id).get();
  if (!doc.exists) return null;
  return asMember(doc.id, doc.data());
}

export async function getMemberByUserId(userId: string): Promise<Member | null> {
  if (!userId) return null;
  const snap = await membersCol.where("userId", "==", userId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return asMember(doc.id, doc.data());
}

export async function linkMemberUser(memberId: string, userId: string) {
  await membersCol.doc(memberId).update({ userId });
}

export async function listLeaderTermsByGroup(groupId: string): Promise<GroupLeaderTerm[]> {
  const snap = await groupLeaderTermsCol.where("groupId", "==", groupId).get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function findActiveLeaderTerm(
  groupId: string,
  leaderId: string,
): Promise<GroupLeaderTerm | null> {
  const snap = await groupLeaderTermsCol
    .where("groupId", "==", groupId)
    .where("leaderId", "==", leaderId)
    .where("endedAt", "==", null)
    .get();
  if (snap.empty) return null;
  const docs = snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return docs[0] ?? null;
}

export async function createGroup(name: string, description?: string | null): Promise<Group> {
  const term = await getCurrentTerm();
  const ref = groupsCol.doc();
  const group: Omit<Group, "id"> = {
    name,
    description: description ?? null,
    currentLeaderId: null,
    year: term.year,
    half: term.half,
  };
  await ref.set(group);
  return { id: ref.id, ...group };
}

export async function createMember(
  groupId: string,
  name: string,
  phone?: string | null,
): Promise<Member> {
  const ref = membersCol.doc();
  const member: Omit<Member, "id"> = {
    groupId,
    name,
    phone: phone ?? null,
    userId: null,
    createdAt: new Date().toISOString(),
  };
  await ref.set(member);
  return { id: ref.id, ...member };
}

export async function assignMemberToGroup(memberId: string, groupId: string) {
  await membersCol.doc(memberId).update({ groupId });
}

/** 가장 구성: 해당 가족(학기)의 가장을 임명하고 이전 임기를 닫는다. */
export async function handoverGroupLeader(groupId: string, newLeaderId: string) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");

  const now = new Date().toISOString();

  if (group.currentLeaderId) {
    const active = await findActiveLeaderTerm(groupId, group.currentLeaderId);
    if (active) {
      await groupLeaderTermsCol.doc(active.id).update({ endedAt: now });
    }
  }

  const ref = groupLeaderTermsCol.doc();
  await ref.set({
    groupId,
    leaderId: newLeaderId,
    year: group.year,
    half: group.half,
    startedAt: now,
    endedAt: null,
  });
  await groupsCol.doc(groupId).update({ currentLeaderId: newLeaderId });
}

export async function getUsersMapForLeaderTerms(terms: GroupLeaderTerm[]) {
  return getUsersByIds(terms.map((t) => t.leaderId));
}
