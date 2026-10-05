/** 로그인 계정 역할. 목사/관리자는 시스템 전체, LEADER는 현장 리더(가장 또는 임원, 겸임 가능). */
export type Role = "PASTOR" | "LEADER" | "ADMIN";

export const ROLES: Role[] = ["PASTOR", "LEADER", "ADMIN"];

/** 2청년회 임원 8직책. 가장을 겸임할 수 있다. */
export const OFFICER_TITLES = [
  "회장",
  "부회장",
  "총무",
  "부총무",
  "서기",
  "부서기",
  "회계",
  "부회계",
] as const;

export type OfficerTitle = (typeof OFFICER_TITLES)[number];

/** 그해 임원. 상반기에 정하고 하반기까지 유지한다. */
export type OfficerAppointment = {
  id: string;
  userId: string;
  year: number;
  title: OfficerTitle;
  startedAt: string;
  endedAt: string | null;
};

/** 리더모임에서 그 주 담당을 정하는 섬김 항목. 배정하면 해당 사용자에게 푸시가 간다. */
export const SERVING_DUTIES = [
  { key: "prayer_meeting_lead", label: "기도회 인도" },
] as const;

export type ServingDutyKey = (typeof SERVING_DUTIES)[number]["key"];

export const SERVING_DUTY_BY_KEY: Record<ServingDutyKey, (typeof SERVING_DUTIES)[number]> =
  Object.fromEntries(SERVING_DUTIES.map((d) => [d.key, d])) as Record<
    ServingDutyKey,
    (typeof SERVING_DUTIES)[number]
  >;

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  /** 로그인 식별자(동명이인 구분). 정규화된 숫자 문자열. */
  phone: string | null;
  /** 운영자가 설정한 초기 비밀번호로 첫 로그인 시 true. 변경 후 false. */
  mustChangePassword?: boolean;
  role: Role;
  officerTitle: OfficerTitle | null;
  createdAt: string;
};

/** 가족 (구 "조"). 상하반기마다 새로 구성한다. */
export type Group = {
  id: string;
  name: string;
  description: string | null;
  currentLeaderId: string | null;
  year: number;
  half: "H1" | "H2";
};

/** 가족원 (구 "조원"). 가장·임원도 성도 한 명이며, 앱 계정은 `userId`로 연결한다. */
export type Member = {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
  createdAt: string;
  /** 로그인 계정. 가장·임원만 연결되고, 계정이 없는 성도는 null. */
  userId: string | null;
};

/** 가장 임기. 원칙적으로 상반기·하반기 각 1회. */
export type GroupLeaderTerm = {
  id: string;
  groupId: string;
  leaderId: string;
  year: number;
  half: "H1" | "H2";
  startedAt: string;
  endedAt: string | null;
};

export type MeetingAssetKind = "LESSON" | "LESSON_COMMENTARY" | "SCORE";

/** 리더모임 자료 (교안/해설지/악보) */
export type MeetingAsset = {
  id: string;
  meetingId: string;
  kind: MeetingAssetKind;
  fileName: string;
  storageKey: string;
  uploadedById: string;
  createdAt: string;
  /** 교안 해설지만 사용. 공개 전에는 가장 등 일반 리더에게 노출하지 않는다. */
  published?: boolean;
  publishedAt?: string | null;
  publishedById?: string | null;
};

/** 리더모임 (구 LeaderMeeting) */
export type LeaderMeeting = {
  id: string;
  title: string;
  date: string;
  notes: string | null;
  prayerLeaderId: string | null;
  /** 이번 모임 섬김 담당 (userId). `prayer_meeting_lead`는 `prayerLeaderId`와 동기화. */
  dutyUserIds?: Partial<Record<ServingDutyKey, string | null>>;
  createdAt: string;
};

export function meetingDutyUserId(
  meeting: LeaderMeeting,
  dutyKey: ServingDutyKey,
): string | null {
  if (dutyKey === "prayer_meeting_lead") {
    return meeting.prayerLeaderId ?? meeting.dutyUserIds?.prayer_meeting_lead ?? null;
  }
  return meeting.dutyUserIds?.[dutyKey] ?? null;
}

export type WorshipService = {
  id: string;
  date: string;
  title: string;
};

export type SeatingZone = {
  id: string;
  serviceId: string;
  name: string;
  sortOrder: number;
  gridRow: number | null;
  gridCol: number | null;
};

export type SeatingAssignment = {
  id: string;
  serviceId: string;
  zoneId: string;
  groupId: string;
};

/** 돌봄카드 방 (가족당 1개, 구 PastoralThread) */
export type PastoralThread = {
  id: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
};

/** 돌봄카드 메시지. aboutMemberId가 있으면 특정 가족원 관련 글. */
export type PastoralMessage = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  aboutMemberId: string | null;
  createdAt: string;
};

export function isPastorOrAdmin(role: Role) {
  return role === "PASTOR" || role === "ADMIN";
}

/** 앱 운영: 목사·관리자, 또는 2청년회 임원 8직책. 임원이 아닌 가장은 불가. */
export function canManageApp(user: Pick<User, "role" | "officerTitle">): boolean {
  if (isPastorOrAdmin(user.role)) return true;
  return user.officerTitle != null && OFFICER_TITLES.includes(user.officerTitle);
}

/** 공지 작성·발송은 앱 운영과 같은 권한이다. */
export function canManageAnnouncements(user: Pick<User, "role" | "officerTitle">): boolean {
  return canManageApp(user);
}

export type AnnouncementAudience = "all" | "leaders" | "users";
export type AnnouncementStatus = "draft" | "sent";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  /** audience === "users"일 때만 사용 */
  selectedUserIds: string[];
  status: AnnouncementStatus;
  createdById: string;
  createdAt: string;
  sentAt?: string;
  sentById?: string;
  pushSuccessCount?: number;
  pushFailureCount?: number;
};

/** 출석 상태. 출석(present)과 온라인(broadcast)은 하나만 켠다. 둘 다 꺼지면 결석(none). */
export type AttendanceStatus = "present" | "broadcast" | "none";

export type AttendanceServiceMark = {
  status: AttendanceStatus;
  /** 교회 QR 출입 시스템 명단 업로드로만 켜진다. 목사/관리자는 예외적으로 수동 수정 가능. */
  qr: boolean;
};

/**
 * 출석 단위.
 * weekly: 매주 주일. 일정을 등록하지 않아도 그 주 일요일이 항상 있다.
 * special: 수련회·특별 모임처럼 비정기 출석체크. 임원·목사가 필요할 때만 연다.
 * kind가 없는 예전 문서는 weekly로 본다.
 */
export type AttendanceSundayKind = "weekly" | "special";

export type AttendanceSunday = {
  id: string;
  date: string;
  title: string;
  createdAt: string;
  kind?: AttendanceSundayKind;
};

export function isSpecialAttendance(sunday: Pick<AttendanceSunday, "kind">): boolean {
  return sunday.kind === "special";
}

/** 가족원 1명의 그 주일 출석. 문서 id는 `{sundayId}_{memberId}`. */
export type AttendanceMark = {
  id: string;
  sundayId: string;
  memberId: string;
  groupId: string;
  s13: AttendanceServiceMark;
  s4: AttendanceServiceMark;
  /** 4부 이후 가족모임 참석 여부. 예배 부와 무관하게 하루에 한 번만 체크한다. */
  familyMeeting: boolean;
  updatedAt: string;
  updatedById: string;
};

export type SurveyQuestionType = "yesno" | "number" | "text";

export type SurveyQuestion = {
  id: string;
  label: string;
  type: SurveyQuestionType;
};

/**
 * general: 질문을 직접 짜는 조사.
 * participation: 가족원마다 참여 여부만 받는 조사.
 * wednesday: 예전 참석예정 문서. 응답 방식은 participation과 같다.
 * kind가 없는 예전 문서는 general로 본다.
 */
export type EventSurveyKind = "general" | "participation" | "wednesday";

export function isParticipationSurvey(kind: EventSurveyKind | undefined): boolean {
  return kind === "participation" || kind === "wednesday";
}

/** 필요할 때만 여는 참여조사. 가족 참여만 받거나, 질문을 직접 만든다. */
export type EventSurvey = {
  id: string;
  title: string;
  eventDate: string;
  description: string | null;
  status: "open" | "closed";
  questions: SurveyQuestion[];
  createdAt: string;
  kind?: EventSurveyKind;
};

/** 가족원 1명의 조사 응답. 문서 id는 `{surveyId}_{memberId}`. */
export type EventResponse = {
  id: string;
  surveyId: string;
  memberId: string;
  groupId: string;
  answers: Record<string, string | number | boolean>;
  updatedAt: string;
  updatedById: string;
};
