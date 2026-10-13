import { Suspense } from "react";
import { auth } from "@/auth";
import { AppSummaryCards } from "@/components/app-summary-cards";
import { HomeCardGrid } from "@/components/home-card-grid";
import { PollDayBanner } from "@/components/poll-day-banner";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { getCurrentUser } from "@/lib/auth";
import { isWebPushConfigured } from "@/lib/firebase-client";
import { accountLabel } from "@/lib/format";
import { buildHomeCards } from "@/lib/platform/home-cards";
import { resolvePlatformPersonas } from "@/lib/platform/roles";
import { listMarksBySunday, listWeeklySundaySlots } from "@/lib/store/attendance";
import { getGroupByCurrentLeader, listGroups } from "@/lib/store/groups";
import { listMeetings } from "@/lib/store/meetings";
import { getPollDayBannerIfToday } from "@/lib/store/poll-day";
import { listPushSubscriptionsForUser } from "@/lib/store/push-subscriptions";
import { canManageApp, isMeetingAttendee } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;
  const actor = await getCurrentUser();
  const manages = actor ? canManageApp(actor) : false;
  const attendee = isMeetingAttendee(user.role);

  const myGroup = user.role === "LEADER" ? await getGroupByCurrentLeader(user.id) : null;

  const attendanceGroups = attendee ? [] : manages ? await listGroups() : myGroup ? [myGroup] : [];

  const currentWeek = attendee ? null : (await listWeeklySundaySlots(1))[0] ?? null;
  const latestSunday = currentWeek?.sunday ?? null;
  let missingAttendanceCount = 0;
  let myAttendanceMissing = false;
  if (latestSunday) {
    const marks = currentWeek?.persisted ? await listMarksBySunday(latestSunday.id) : [];
    const groupIdsWithMarks = new Set(marks.map((m) => m.groupId));
    if (manages) {
      missingAttendanceCount = attendanceGroups.filter((g) => !groupIdsWithMarks.has(g.id)).length;
    } else if (myGroup) {
      myAttendanceMissing = !groupIdsWithMarks.has(myGroup.id);
    }
  }

  const meetings = await listMeetings();
  const upcoming = meetings.find((m) => new Date(m.date) >= new Date()) ?? meetings[0] ?? null;

  const familyReportHref = myGroup ? `/reports/${myGroup.id}` : "/reports";

  const personas = actor
    ? resolvePlatformPersonas({
        user: actor,
        ledGroup: myGroup,
        trainingManagerProgramIds: undefined,
        trainingParticipantProgramIds: undefined,
      })
    : [];

  const homeCards = buildHomeCards({
    personas,
    latestSundayId: latestSunday?.id ?? null,
    latestSundayTitle: latestSunday?.title ?? null,
    myGroupId: myGroup?.id ?? null,
    myGroupName: myGroup?.name ?? null,
    familyReportHref,
    missingAttendanceCount,
    myAttendanceMissing,
    nextMeetingTitle: upcoming?.title ?? null,
    nextMeetingHref: upcoming ? `/meetings/${upcoming.id}` : null,
  });

  const webPushConfigured = isWebPushConfigured();
  const webPushSubscribed = webPushConfigured
    ? (await listPushSubscriptionsForUser(user.id)).length > 0
    : false;

  const pollBanner = await getPollDayBannerIfToday();

  return (
    <div className="space-y-6">
      {pollBanner && <PollDayBanner href={pollBanner.href} />}

      <div>
        <h2 className="text-xl font-semibold text-foreground">안녕하세요, {user.name}님</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          역할: {accountLabel(actor ?? user)}
        </p>
      </div>

      {/* 훈련·통독 요약: 플래그가 켜져 있고 참여 중일 때만. 실패해도 대시보드는 기다리지 않는다. */}
      {!attendee && (
        <Suspense fallback={null}>
          <AppSummaryCards sub={user.id} />
        </Suspense>
      )}

      <HomeCardGrid cards={homeCards} />

      <PushNotificationSettings
        configured={webPushConfigured}
        initialSubscribed={webPushSubscribed}
      />
    </div>
  );
}
