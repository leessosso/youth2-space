import type { PlatformPersona } from "@/lib/platform/roles";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";

export type HomeCardId =
  | "weekly_attendance"
  | "my_family_attendance"
  | "new_family_group"
  | "training_self_checkin"
  | "training_attendance_overview"
  | "training_participants"
  | "upcoming_meeting"
  | "care"
  | "training_hub"
  | "members_officers";

export type HomeCardVariant = "default" | "emphasis";

export type HomeCard = {
  id: HomeCardId;
  title: string;
  description: string;
  href: string;
  variant: HomeCardVariant;
  badge?: string;
};

/** 여러 역할 병합 시 카드 정렬 (§5.4). 투표 배너는 후속 PR. */
const CARD_ORDER: HomeCardId[] = [
  "weekly_attendance",
  "my_family_attendance",
  "new_family_group",
  "training_self_checkin",
  "training_attendance_overview",
  "training_participants",
  "upcoming_meeting",
  "care",
  "training_hub",
  "members_officers",
];

const CARDS_BY_PERSONA: Record<PlatformPersona, HomeCardId[]> = {
  pastor_officer: [
    "weekly_attendance",
    "upcoming_meeting",
    "training_hub",
    "members_officers",
  ],
  family_head: ["my_family_attendance", "upcoming_meeting", "care"],
  ministry_team_lead: ["upcoming_meeting"],
  new_family_lead: ["new_family_group", "upcoming_meeting"],
  training_manager: ["training_attendance_overview", "training_participants"],
  training_participant: ["training_self_checkin"],
  meeting_attendee: ["upcoming_meeting"],
};

export type HomeCardBuildContext = {
  personas: PlatformPersona[];
  latestSundayId: string | null;
  latestSundayTitle: string | null;
  myGroupId: string | null;
  myGroupName: string | null;
  familyReportHref: string;
  missingAttendanceCount: number;
  myAttendanceMissing: boolean;
  nextMeetingTitle: string | null;
  /** 오늘(서울) 이후 모임이 없어 지난 모임을 보여줄 때 true. */
  nextMeetingIsPast?: boolean;
  nextMeetingHref: string | null;
};

function cardDefinitions(ctx: HomeCardBuildContext): Record<HomeCardId, HomeCard> {
  const sundayHref = ctx.latestSundayId ? `/attendance/${ctx.latestSundayId}` : "/attendance";
  const myFamilyAttendanceHref =
    ctx.latestSundayId && ctx.myGroupId
      ? `/attendance/${ctx.latestSundayId}/${ctx.myGroupId}`
      : ctx.myGroupId
        ? "/attendance"
        : "/attendance";

  return {
    weekly_attendance: {
      id: "weekly_attendance",
      title: "이번 주 출석",
      description:
        ctx.missingAttendanceCount > 0
          ? `${ctx.latestSundayTitle ?? "이번 주일"} · 미입력 가족 ${ctx.missingAttendanceCount}곳`
          : ctx.latestSundayTitle
            ? `${ctx.latestSundayTitle} 출석 현황`
            : "가족별 출석을 확인하고 입력합니다.",
      href: sundayHref,
      variant: "default",
      badge: ctx.missingAttendanceCount > 0 ? `${ctx.missingAttendanceCount}곳` : undefined,
    },
    my_family_attendance: {
      id: "my_family_attendance",
      title: "내 가족 출석",
      description:
        ctx.myAttendanceMissing && ctx.latestSundayTitle
          ? `${ctx.latestSundayTitle} 출석을 입력해 주세요`
          : ctx.myGroupName
            ? `${ctx.myGroupName} 출석`
            : "담당 가족 출석을 입력합니다.",
      href: myFamilyAttendanceHref,
      variant: "default",
      badge: ctx.myAttendanceMissing ? "입력 필요" : undefined,
    },
    new_family_group: {
      id: "new_family_group",
      title: "새가족반",
      description: ctx.myGroupName
        ? `${ctx.myGroupName} · 출석 체크`
        : "새가족반 출석과 돌봄을 관리합니다.",
      href: myFamilyAttendanceHref,
      variant: "default",
    },
    training_self_checkin: {
      id: "training_self_checkin",
      title: "오늘 · 이번 회차 출석",
      description: "훈련 프로그램에서 본인 출석을 체크합니다.",
      href: TRAINING_SSO_ENTRY_PATH,
      variant: "emphasis",
    },
    training_attendance_overview: {
      id: "training_attendance_overview",
      title: "내 프로그램 출석 현황",
      description: "담당 프로그램의 출석을 확인하고 대리 체크합니다.",
      href: TRAINING_SSO_ENTRY_PATH,
      variant: "default",
    },
    training_participants: {
      id: "training_participants",
      title: "참여자",
      description: "프로그램 참여자 명단과 출석을 관리합니다.",
      href: TRAINING_SSO_ENTRY_PATH,
      variant: "default",
    },
    upcoming_meeting: {
      id: "upcoming_meeting",
      title: "리더 모임",
      description: ctx.nextMeetingTitle
        ? `${ctx.nextMeetingIsPast ? "지난 모임" : "다가오는 모임"}: ${ctx.nextMeetingTitle}`
        : "월례 리더 모임 일정과 자료",
      href: ctx.nextMeetingHref ?? "/meetings",
      variant: "default",
    },
    care: {
      id: "care",
      title: "돌봄",
      description: "가족 돌봄카드를 작성하고 확인합니다.",
      href: ctx.familyReportHref,
      variant: "default",
    },
    training_hub: {
      id: "training_hub",
      title: "훈련 프로그램",
      description: "훈련 프로그램 운영·출석 메뉴로 이동합니다.",
      href: TRAINING_SSO_ENTRY_PATH,
      variant: "default",
    },
    members_officers: {
      id: "members_officers",
      title: "성도 · 직책 관리",
      description: "성도 명단과 가장·임원 임명을 관리합니다.",
      href: "/admin/members",
      variant: "default",
    },
  };
}

export function buildHomeCards(ctx: HomeCardBuildContext): HomeCard[] {
  const wanted = new Set<HomeCardId>();
  for (const persona of ctx.personas) {
    for (const id of CARDS_BY_PERSONA[persona]) {
      wanted.add(id);
    }
  }

  if (wanted.size === 0) {
    wanted.add("upcoming_meeting");
  }

  const defs = cardDefinitions(ctx);
  return CARD_ORDER.filter((id) => wanted.has(id)).map((id) => defs[id]);
}
