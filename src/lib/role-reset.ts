import type { Group, User } from "@/lib/types";

/**
 * 「임원 초기화」·「가장 초기화」 대상 선정 (순수 함수, 테스트로 고정).
 * 공통 제외: PASTOR·ADMIN, ATTENDEE(게스트·새가족팀원), 실행자 본인.
 */

export type ResetCandidate = { id: string; name: string; detail: string };

function excluded(user: Pick<User, "id" | "role">, actorId: string) {
  return user.id === actorId || user.role === "PASTOR" || user.role === "ADMIN" || user.role === "ATTENDEE";
}

/** 임원 초기화: 직책(officerTitle)이 남아 있는 LEADER·MEMBER. 역할은 그대로 두고 직책만 비운다. */
export function selectOfficerResetTargets(
  users: Pick<User, "id" | "name" | "role" | "officerTitle">[],
  actorId: string,
): ResetCandidate[] {
  return users
    .filter((u) => !excluded(u, actorId) && u.officerTitle != null)
    .map((u) => ({ id: u.id, name: u.name, detail: u.officerTitle ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 가장 초기화: 직책 없는 LEADER를 MEMBER로 내린다. 임원(직책 있는 LEADER)은 운영 권한 때문에 남긴다.
 * 이번 학기 가족의 현재 가장이면 그 가족의 가장 자리도 비운다.
 */
export function selectLeaderResetTargets(
  users: Pick<User, "id" | "name" | "role" | "officerTitle">[],
  currentGroups: Pick<Group, "id" | "name" | "currentLeaderId">[],
  actorId: string,
): (ResetCandidate & { groupIds: string[] })[] {
  return users
    .filter((u) => !excluded(u, actorId) && u.role === "LEADER" && u.officerTitle == null)
    .map((u) => {
      const led = currentGroups.filter((g) => g.currentLeaderId === u.id);
      return {
        id: u.id,
        name: u.name,
        detail: led.length ? `${led.map((g) => g.name).join(", ")} 가장` : "담당 가족 없음",
        groupIds: led.map((g) => g.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/** 미리보기 이후 대상이 바뀌었는지 (다른 운영자가 동시에 바꾼 경우 실행을 막는다). */
export function sameTargetIds(expected: string[], actual: { id: string }[]) {
  const a = [...new Set(expected)].sort();
  const b = actual.map((t) => t.id).sort();
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
