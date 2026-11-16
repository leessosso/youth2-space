import type { CollectionReference, DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase-admin";
import type {
  AttendanceMark,
  AttendanceSunday,
  Announcement,
  EventResponse,
  EventSurvey,
  Group,
  GroupLeaderTerm,
  LeaderMeeting,
  OfficerAppointment,
  Member,
  MeetingAsset,
  PastoralMessage,
  PastoralThread,
  SeatingAssignment,
  SeatingZone,
  User,
  WorshipService,
} from "@/lib/types";
import type { MonthlyAssembly } from "@/lib/monthly-assembly";
import type { Term } from "@/lib/term";

/** 빌드 시 Firestore에 연결하지 않도록 컬렉션 참조를 첫 사용 시점에 만든다. */
function lazyCollection<T extends DocumentData>(name: string): CollectionReference<T> {
  let ref: CollectionReference<T> | undefined;
  return new Proxy({} as CollectionReference<T>, {
    get(_target, prop) {
      if (!ref) ref = getDb().collection(name) as CollectionReference<T>;
      const value = Reflect.get(ref, prop, ref);
      return typeof value === "function" ? value.bind(ref) : value;
    },
  });
}

export const usersCol = lazyCollection<Omit<User, "id">>("users");
export const groupsCol = lazyCollection<Omit<Group, "id">>("groups");
export const membersCol = lazyCollection<Omit<Member, "id">>("members");
export const groupLeaderTermsCol = lazyCollection<Omit<GroupLeaderTerm, "id">>("groupLeaderTerms");
export const officerAppointmentsCol = lazyCollection<Omit<OfficerAppointment, "id">>("officerAppointments");
export const leaderMeetingsCol = lazyCollection<Omit<LeaderMeeting, "id">>("leaderMeetings");
export const monthlyAssembliesCol = lazyCollection<Omit<MonthlyAssembly, "id">>("monthlyAssemblies");
export const meetingAssetsCol = lazyCollection<Omit<MeetingAsset, "id">>("meetingAssets");
export const worshipServicesCol = lazyCollection<Omit<WorshipService, "id">>("worshipServices");
export const seatingZonesCol = lazyCollection<Omit<SeatingZone, "id">>("seatingZones");
export const seatingAssignmentsCol = lazyCollection<Omit<SeatingAssignment, "id">>("seatingAssignments");
export const pastoralThreadsCol = lazyCollection<Omit<PastoralThread, "id">>("pastoralThreads");
export const pastoralMessagesCol = lazyCollection<Omit<PastoralMessage, "id">>("pastoralMessages");
export const settingsCol = lazyCollection<Term>("settings");
export const attendanceSundaysCol = lazyCollection<Omit<AttendanceSunday, "id">>("attendanceSundays");
export const attendanceMarksCol = lazyCollection<Omit<AttendanceMark, "id">>("attendanceMarks");
export const announcementsCol = lazyCollection<Omit<Announcement, "id">>("announcements");
export const eventSurveysCol = lazyCollection<Omit<EventSurvey, "id">>("eventSurveys");
export const eventResponsesCol = lazyCollection<Omit<EventResponse, "id">>("eventResponses");
export const pushSubscriptionsCol = lazyCollection<{
  userId: string;
  token: string;
  createdAt: string;
  lastSeenAt: string;
  userAgent?: string;
}>("pushSubscriptions");

export function withId<T extends DocumentData>(
  snap: QueryDocumentSnapshot<T>,
): T & { id: string } {
  return { id: snap.id, ...snap.data() };
}
