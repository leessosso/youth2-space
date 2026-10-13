import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isTrainingShortcut, TongdokSummaryCard, TrainingSummaryCard } from "@/components/app-summary-cards";
import { HomeCardLink } from "@/components/home-card-grid";
import { PollDayBanner } from "@/components/poll-day-banner";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { getCurrentUser } from "@/lib/auth";
import { isWebPushConfigured } from "@/lib/firebase-client";
import { accountLabel } from "@/lib/format";
import { buildHomeCards, type HomeCard } from "@/lib/platform/home-cards";
import { earliestDate, orderByNearestDate, pickDashboardMeeting, type Dated } from "@/lib/platform/home-order";
import { fetchAppSummaries } from "@/lib/platform/summary/fetch";
import { isWeeklyAttendanceOpen, kstDateKeyFromIso, kstDateKeyNow } from "@/lib/kst-date";
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
  // 요약은 다른 데이터와 병렬로 시작한다(앱별 3초 상한, 실패 시 최근 응답 또는 null). 날짜 정렬에 쓰려고 페이지에서 기다린다.
  const summariesPromise = attendee ? null : fetchAppSummaries(user.id);

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

  const today = kstDateKeyNow();
  const meetings = await listMeetings();
  // 오늘(서울) 이후 가장 가까운 모임, 없으면 가장 최근 지난 모임.
  const pickedMeeting = pickDashboardMeeting(meetings, (m) => kstDateKeyFromIso(m.date), today);
  const upcoming = pickedMeeting?.meeting ?? null;

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
    nextMeetingIsPast: pickedMeeting?.kind === "past",
    nextMeetingHref: upcoming ? `/meetings/${upcoming.id}` : null,
  });

  const summaries = summariesPromise ? await summariesPromise : null;
  const programs = summaries?.training?.programs.filter((p) => p.status === "active") ?? [];
  const cohorts = summaries?.tongdok?.cohorts ?? [];

  const sundayKey = latestSunday ? kstDateKeyFromIso(latestSunday.date) : null;
  // 이번 주 출석은 입력 기간 중이면 '오늘'로 본다.
  const attendanceDate = sundayKey && isWeeklyAttendanceOpen(sundayKey) ? today : sundayKey;
  const meetingDate = pickedMeeting?.date ?? null;
  const cardDate = (card: HomeCard): string | null => {
    switch (card.id) {
      case "weekly_attendance":
      case "my_family_attendance":
      case "new_family_group":
        return attendanceDate;
      case "upcoming_meeting":
        return meetingDate;
      default:
        return null;
    }
  };

  const emphasis = homeCards.filter((c) => c.variant === "emphasis");
  const dated: Dated<{ key: string; node: ReactNode }>[] = homeCards
    .filter((c) => c.variant !== "emphasis")
    // 훈련 요약이 있으면 요약 카드가 `훈련 프로그램` 바로가기를 대신한다.
    .filter((c) => !(programs.length > 0 && isTrainingShortcut(c)))
    .map((card) => ({ item: { key: card.id, node: <HomeCardLink card={card} /> }, date: cardDate(card) }));
  if (programs.length > 0) {
    dated.push({
      item: { key: "training_summary", node: <TrainingSummaryCard programs={programs} /> },
      date: earliestDate(programs.map((p) => p.nextSession?.date)),
    });
  }
  if (cohorts.length > 0) {
    dated.push({
      item: { key: "tongdok_summary", node: <TongdokSummaryCard cohorts={cohorts} /> },
      date: cohorts.some((c) => c.today) ? today : null,
    });
  }
  const ordered = orderByNearestDate(dated, today);

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

      {/* 강조 카드(오늘 할 일)는 맨 위에 고정, 나머지는 가까운 날짜순(home-order.ts). */}
      {emphasis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1">
          {emphasis.map((card) => (
            <HomeCardLink key={card.id} card={card} />
          ))}
        </div>
      )}
      {ordered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ordered.map(({ key, node }) => (
            <div key={key}>{node}</div>
          ))}
        </div>
      )}

      <PushNotificationSettings
        configured={webPushConfigured}
        initialSubscribed={webPushSubscribed}
      />
    </div>
  );
}
