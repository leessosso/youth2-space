import {
  leaderMeetingsCol,
  meetingAssetsCol,
  withId,
} from "@/lib/store/collections";
import type {
  LeaderMeeting,
  MeetingAsset,
  MeetingAssetKind,
  ServingDutyKey,
} from "@/lib/types";
import { meetingDutyUserId } from "@/lib/types";

export async function listMeetings(): Promise<LeaderMeeting[]> {
  const snap = await leaderMeetingsCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getMeetingById(id: string): Promise<LeaderMeeting | null> {
  const doc = await leaderMeetingsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function createMeeting(data: {
  title: string;
  date: string;
  notes?: string | null;
}): Promise<LeaderMeeting> {
  const ref = leaderMeetingsCol.doc();
  const meeting: Omit<LeaderMeeting, "id"> = {
    title: data.title,
    date: data.date,
    notes: data.notes ?? null,
    prayerLeaderId: null,
    createdAt: new Date().toISOString(),
  };
  await ref.set(meeting);
  return { id: ref.id, ...meeting };
}

export async function updateMeetingNotes(meetingId: string, notes: string) {
  await leaderMeetingsCol.doc(meetingId).update({ notes });
}

export async function updateMeetingScripture(
  meetingId: string,
  scripture: { reference: string; body: string },
) {
  await leaderMeetingsCol.doc(meetingId).update({
    scripture: {
      reference: scripture.reference.trim(),
      body: scripture.body.trim(),
    },
  });
}

export async function setMeetingPrayerLeader(meetingId: string, prayerLeaderId: string | null) {
  const result = await setMeetingDutyUser(meetingId, "prayer_meeting_lead", prayerLeaderId);
  return result;
}

/** 모임별 섬김 담당 userId. 기도회 인도는 `prayerLeaderId`와 함께 갱신한다. */
export async function setMeetingDutyUser(
  meetingId: string,
  dutyKey: ServingDutyKey,
  userId: string | null,
): Promise<{ previousUserId: string | null }> {
  const doc = await leaderMeetingsCol.doc(meetingId).get();
  if (!doc.exists) throw new Error("MEETING_NOT_FOUND");
  const data = doc.data()!;
  const meeting = { id: doc.id, ...data } as LeaderMeeting;
  const previousUserId = meetingDutyUserId(meeting, dutyKey);

  const dutyUserIds = { ...(meeting.dutyUserIds ?? {}), [dutyKey]: userId || null };
  const updates: Record<string, unknown> = { dutyUserIds };
  if (dutyKey === "prayer_meeting_lead") {
    updates.prayerLeaderId = userId || null;
  }

  await leaderMeetingsCol.doc(meetingId).update(updates);
  return { previousUserId };
}

export async function listAssetsByMeeting(meetingId: string): Promise<MeetingAsset[]> {
  const snap = await meetingAssetsCol.where("meetingId", "==", meetingId).get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addMeetingAsset(data: {
  meetingId: string;
  kind: MeetingAssetKind;
  fileName: string;
  storageKey: string;
  uploadedById: string;
}): Promise<MeetingAsset> {
  const ref = meetingAssetsCol.doc();
  const asset: Omit<MeetingAsset, "id"> = {
    ...data,
    createdAt: new Date().toISOString(),
    ...(data.kind === "LESSON_COMMENTARY"
      ? { published: false, publishedAt: null, publishedById: null }
      : {}),
  };
  await ref.set(asset);
  return { id: ref.id, ...asset };
}

export async function getMeetingAssetById(id: string): Promise<MeetingAsset | null> {
  const doc = await meetingAssetsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function setMeetingAssetPublished(
  assetId: string,
  published: boolean,
  publishedById: string | null,
): Promise<void> {
  await meetingAssetsCol.doc(assetId).update({
    published,
    publishedAt: published ? new Date().toISOString() : null,
    publishedById: published ? publishedById : null,
  });
}
