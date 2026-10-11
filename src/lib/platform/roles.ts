import type { Group, User } from "@/lib/types";
import { canManageApp, isMeetingAttendee, isPastorOrAdmin } from "@/lib/types";

/**
 * §5.4 역할별 홈 카드용 플랫폼 페르소나.
 * youth2-space(셸) User/Group 모델과 훈련 프로그램 역할은 단계적으로 맞춘다.
 */
export type PlatformPersona =
  | "pastor_officer"
  | "family_head"
  | "ministry_team_lead"
  | "new_family_lead"
  | "training_manager"
  | "training_participant"
  | "meeting_attendee";

export type PlatformRoleContext = {
  user: Pick<User, "id" | "role" | "officerTitle">;
  /** 이번 학기 담당 가족(가장). */
  ledGroup: Group | null;
  /**
   * TODO(platform): Group에 `kind: "regular" | "new_family"` 등을 두고
   * 새가족반 팀장을 ledGroup + kind로 판별한다.
   */
  // ledGroupKind?: "regular" | "new_family";
  /**
   * TODO(platform): class-management / Firestore와 memberId로 연동 후
   * 훈련 총무·참여자 여부를 채운다.
   */
  trainingManagerProgramIds?: string[];
  trainingParticipantProgramIds?: string[];
};

function isNewFamilyGroup(_group: Group): boolean {
  // TODO(platform): Group.kind === "new_family" 등 스키마 확정 후 구현.
  return false;
}

export function resolvePlatformPersonas(ctx: PlatformRoleContext): PlatformPersona[] {
  const { user, ledGroup } = ctx;
  const personas = new Set<PlatformPersona>();

  if (isMeetingAttendee(user.role)) {
    personas.add("meeting_attendee");
    return [...personas];
  }

  if (isPastorOrAdmin(user.role) || canManageApp(user)) {
    personas.add("pastor_officer");
  }

  if (ledGroup) {
    if (isNewFamilyGroup(ledGroup)) {
      personas.add("new_family_lead");
    } else {
      personas.add("family_head");
    }
  }

  if (
    user.role === "LEADER" &&
    !ledGroup &&
    user.officerTitle == null &&
    !isPastorOrAdmin(user.role)
  ) {
    personas.add("ministry_team_lead");
  }

  if (ctx.trainingManagerProgramIds && ctx.trainingManagerProgramIds.length > 0) {
    personas.add("training_manager");
  }

  if (ctx.trainingParticipantProgramIds && ctx.trainingParticipantProgramIds.length > 0) {
    personas.add("training_participant");
  }

  return [...personas];
}
