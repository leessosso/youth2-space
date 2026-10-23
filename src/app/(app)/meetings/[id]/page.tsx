import Link from "next/link";
import { notFound } from "next/navigation";
import {
  setPrayerLeader,
  updateMeetingLessonText,
  updateMeetingNotes,
} from "@/app/actions";
import { GuestAccessClosed } from "@/components/guest-access-closed";
import { MeetingAssetList } from "@/components/meeting-asset-list";
import { MeetingFileUpload } from "@/components/meeting-file-upload";
import { MeetingEditorAccordion } from "@/components/meeting-editor-accordion";
import { MeetingGuestPanel } from "@/components/meeting-guest-panel";
import { MeetingLessonText } from "@/components/meeting-lesson-text";
import { MeetingScriptureBlock } from "@/components/meeting-scripture";
import { Button, Card, CardHeader, Textarea } from "@/components/ui";
import { kstDateKeyNow } from "@/lib/kst-date";
import { canUploadMeetingScore, canViewMeetingAsset, SCORE_UPLOAD_NOTICE } from "@/lib/meeting-assets";
import { guestCanOpenMeeting, guestMeetingDayOpen, isScopedMeetingGuest, meetingGuestIds } from "@/lib/meeting-guest";
import { resolveMeetingScripture } from "@/lib/meeting-scripture";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTimeKo } from "@/lib/format";
import { listAllMembers, listCurrentLeaderUserIds } from "@/lib/store/groups";
import { getMeetingById, listAssetsByMeeting } from "@/lib/store/meetings";
import { getUsersByIds, listLoginUsersForServing } from "@/lib/store/users";
import {
  SORTING_HAT_ADMIN_PATH,
  SORTING_HAT_USER_PATH,
  meetingReturnPath,
} from "@/lib/sorting-hat";
import { canManageApp, canManageAnnouncements, meetingDutyUserId } from "@/lib/types";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const canAdmin = currentUser ? canManageApp(currentUser) : false;
  const canEditAnnouncement = currentUser ? canManageAnnouncements(currentUser) : false;

  const meeting = await getMeetingById(id);
  if (!meeting) notFound();

  if (
    currentUser &&
    isScopedMeetingGuest(currentUser) &&
    !guestCanOpenMeeting(meeting, currentUser.id, kstDateKeyNow())
  ) {
    return (
      <div className="space-y-6">
        <Link href="/meetings" className="text-sm text-stone-600 underline">← 모임 목록</Link>
        <GuestAccessClosed />
      </div>
    );
  }

  const [assets, loginUsers, leaderIds, roster] = await Promise.all([
    listAssetsByMeeting(id),
    listLoginUsersForServing(),
    listCurrentLeaderUserIds(),
    canAdmin ? listAllMembers() : Promise.resolve([]),
  ]);
  const placedGuestIds = new Set(meetingGuestIds(meeting));
  const placedGuests = [...placedGuestIds].flatMap((guestId) => {
    const account = loginUsers.find((user) => user.id === guestId);
    return account ? [{ id: account.id, name: account.name }] : [];
  });
  const blockedUserIds = new Set(
    loginUsers
      .filter((account) => account.role !== "ATTENDEE" || account.attendeeKind === "new_family")
      .map((account) => account.id),
  );
  const guestMembers = roster
    .filter((member) => {
      if (!member.userId) return true;
      return !blockedUserIds.has(member.userId) && !placedGuestIds.has(member.userId);
    })
    .map((member) => ({
      id: member.id,
      name: member.name,
      phone: member.phone,
      userId: member.userId,
    }));
  const linkedUserIds = new Set(roster.flatMap((member) => (member.userId ? [member.userId] : [])));
  const unlinkedGuests = loginUsers
    .filter(
      (account) =>
        account.role === "ATTENDEE" &&
        account.attendeeKind !== "new_family" &&
        !linkedUserIds.has(account.id),
    )
    .map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
    }));
  const leadersById = await getUsersByIds(leaderIds);
  const familyLeaders = leaderIds
    .map((leaderId) => leadersById.get(leaderId))
    .filter((leader): leader is NonNullable<typeof leader> => !!leader)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const visible = (list: typeof assets) =>
    currentUser ? list.filter((a) => canViewMeetingAsset(a, currentUser)) : [];

  const lessonAssets = visible(assets.filter((a) => a.kind === "LESSON"));
  const commentaryAssets = visible(assets.filter((a) => a.kind === "LESSON_COMMENTARY"));
  const scoreAssets = visible(assets.filter((a) => a.kind === "SCORE"));

  const prayerLeaderId = meetingDutyUserId(meeting, "prayer_meeting_lead");
  const prayerLeaderName = prayerLeaderId
    ? loginUsers.find((l) => l.id === prayerLeaderId)?.name
    : undefined;
  const canUploadScore = canUploadMeetingScore(meeting, currentUser);
  const hatQuery = `?return=${encodeURIComponent(meetingReturnPath(id))}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/meetings" className="text-sm text-stone-600 underline">← 모임 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{meeting.title}</h2>
        <p className="text-sm text-stone-600">{formatDateTimeKo(meeting.date)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          참석: 가장 · 임원 · 새가족팀원 · 게스트 · 목사
        </p>
      </div>

      {canAdmin && (
        <MeetingGuestPanel
          meetingId={id}
          guests={placedGuests}
          members={guestMembers}
          unlinkedGuests={unlinkedGuests}
          dayOpen={guestMeetingDayOpen(meeting.date, kstDateKeyNow())}
        />
      )}

      <Card>
        <CardHeader
          title="1. 기도회"
          subtitle="이번 모임에서 인도할 가장을 고릅니다. 악보는 그 인도자와 임원이 올립니다."
        />
        <div className="space-y-3 p-4 sm:p-5">
          <p className="text-sm text-stone-700">
            인도 가장: <span className="font-medium">{prayerLeaderName ?? "미지정"}</span>
          </p>
          {canAdmin && (
            <MeetingEditorAccordion label="인도 가장 지정" defaultOpen={!prayerLeaderId}>
            <form
              action={async (fd) => {
                "use server";
                await setPrayerLeader(id, (fd.get("userId") as string) ?? "");
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <select
                name="userId"
                defaultValue={prayerLeaderId ?? ""}
                className="rounded-lg border border-input px-2 py-1.5 text-sm"
              >
                <option value="">미지정</option>
                {familyLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary">저장</Button>
            </form>
            </MeetingEditorAccordion>
          )}
          <MeetingAssetList
            meetingId={id}
            assets={scoreAssets}
            emptyLabel="아직 악보 없음"
            canPublishCommentary={false}
          />
          {canUploadScore ? (
            <MeetingEditorAccordion label="악보 올리기" defaultOpen={scoreAssets.length === 0}>
              <MeetingFileUpload meetingId={id} kind="SCORE" label="악보 업로드" />
            </MeetingEditorAccordion>
          ) : (
            <p className="text-xs text-muted-foreground">{SCORE_UPLOAD_NOTICE}</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="2. 말씀 교안 나눔"
          subtitle="이번 주 본문을 함께 읽고, 배정모자로 조를 짠 뒤 교안으로 나눕니다."
        />
        <div className="space-y-4 p-4 sm:p-5">
          <MeetingScriptureBlock
            meetingId={id}
            scripture={resolveMeetingScripture(meeting)}
            canEdit={canAdmin}
          />
          <MeetingLessonText text={meeting.lessonText} />
          <MeetingAssetList
            meetingId={id}
            assets={lessonAssets}
            emptyLabel={meeting.lessonText ? "올린 교안 파일 없음" : "아직 교안 없음"}
            canPublishCommentary={false}
          />
          {canAdmin && (
            <MeetingEditorAccordion
              label="교안 텍스트 입력·수정"
              defaultOpen={!meeting.lessonText && lessonAssets.length === 0}
            >
              <form
                action={async (fd) => {
                  "use server";
                  await updateMeetingLessonText(id, (fd.get("lessonText") as string) ?? "");
                }}
                className="space-y-2"
              >
                <Textarea
                  name="lessonText"
                  rows={12}
                  defaultValue={meeting.lessonText ?? ""}
                  placeholder={"워드 교안 내용을 그대로 붙여 넣으세요.\n# 제목\n- 목록\n1. 번호 목록"}
                />
                <p className="text-xs text-muted-foreground">
                  줄바꿈은 그대로 보입니다. 줄 앞에 #을 붙이면 제목, - 나 1. 을 붙이면 목록이 됩니다. 비우고 저장하면 지워집니다.
                </p>
                <Button type="submit" variant="secondary">교안 텍스트 저장</Button>
              </form>
            </MeetingEditorAccordion>
          )}
          {canAdmin && (
            <MeetingEditorAccordion label="교안 파일 올리기 (이미지·PDF)">
              <MeetingFileUpload meetingId={id} kind="LESSON" label="교안 업로드" />
            </MeetingEditorAccordion>
          )}

          <div className="-mx-4 divide-y divide-muted border-t border-muted sm:-mx-5">
            <Link
              href={`${SORTING_HAT_USER_PATH}${hatQuery}`}
              className="block px-4 py-3 text-sm font-medium text-foreground transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
            >
              배정모자 열기
            </Link>
            {canAdmin && (
              <Link
                href={`${SORTING_HAT_ADMIN_PATH}${hatQuery}`}
                className="block px-4 py-3 text-sm font-medium text-foreground transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                배정 관리
              </Link>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="3. 교안 해설" subtitle="목사님이 나눔 뒤에 교안을 해설합니다." />
        <div className="space-y-3 p-4 sm:p-5">
          <MeetingAssetList
            meetingId={id}
            assets={commentaryAssets}
            emptyLabel="아직 해설지 없음"
            canPublishCommentary={canAdmin}
          />
          {canAdmin && (
            <MeetingEditorAccordion label="해설지 올리기" defaultOpen={commentaryAssets.length === 0}>
              <MeetingFileUpload
                meetingId={id}
                kind="LESSON_COMMENTARY"
                label="교안 해설지 업로드"
                hint="업로드 직후 비공개입니다. 공개를 누르면 모임에 앉은 사람에게 보입니다."
              />
            </MeetingEditorAccordion>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="4. 그 주 광고" subtitle="2청년회 광고입니다. 목사·임원이 적습니다." />
        {canEditAnnouncement ? (
          <form
            action={async (fd) => {
              "use server";
              await updateMeetingNotes(id, fd.get("notes") as string);
            }}
            className="space-y-3 p-4 sm:p-5"
          >
            {meeting.notes && (
              <p className="whitespace-pre-wrap text-sm text-stone-700">{meeting.notes}</p>
            )}
            <MeetingEditorAccordion label="광고 입력·수정" defaultOpen={!meeting.notes}>
              <Textarea name="notes" defaultValue={meeting.notes ?? ""} placeholder="이번 주 광고" />
              <Button type="submit">저장</Button>
            </MeetingEditorAccordion>
          </form>
        ) : (
          <p className="whitespace-pre-wrap px-4 py-3 text-sm text-stone-700 sm:px-5">
            {meeting.notes || "아직 광고 없음"}
          </p>
        )}
      </Card>
    </div>
  );
}
