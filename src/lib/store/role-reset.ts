import { groupLeaderTermsCol, groupsCol, officerAppointmentsCol, usersCol } from "@/lib/store/collections";
import { findActiveLeaderTerm, listGroups } from "@/lib/store/groups";
import { listAllUsers, setUserRole, updateOfficerTitle } from "@/lib/store/users";
import { selectLeaderResetTargets, selectOfficerResetTargets } from "@/lib/role-reset";

export async function previewOfficerReset(actorId: string) {
  return selectOfficerResetTargets(await listAllUsers(), actorId);
}

export async function previewLeaderReset(actorId: string) {
  const [users, groups] = await Promise.all([listAllUsers(), listGroups()]);
  return selectLeaderResetTargets(users, groups, actorId);
}

/** 대상의 활성 임원 임명(모든 해)을 닫고 계정 직책을 비운다. */
export async function applyOfficerReset(userIds: string[]) {
  const endedAt = new Date().toISOString();
  for (const userId of userIds) {
    const active = await officerAppointmentsCol
      .where("userId", "==", userId)
      .where("endedAt", "==", null)
      .get();
    await Promise.all(active.docs.map((doc) => doc.ref.update({ endedAt })));
    await updateOfficerTitle(userId, null);
  }
}

/** 대상을 MEMBER로 내리고, 이번 학기 가족의 가장 자리와 활성 임기를 닫는다. */
export async function applyLeaderReset(targets: { id: string; groupIds: string[] }[]) {
  const endedAt = new Date().toISOString();
  for (const target of targets) {
    for (const groupId of target.groupIds) {
      const term = await findActiveLeaderTerm(groupId, target.id);
      if (term) await groupLeaderTermsCol.doc(term.id).update({ endedAt });
      await groupsCol.doc(groupId).update({ currentLeaderId: null });
    }
    const snap = await usersCol.doc(target.id).get();
    if (snap.data()?.role === "LEADER") await setUserRole(target.id, "MEMBER", null);
  }
}
