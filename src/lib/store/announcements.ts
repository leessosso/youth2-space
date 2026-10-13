import { listCurrentLeaderUserIds } from "@/lib/store/groups";
import { announcementsCol, withId } from "@/lib/store/collections";
import { listSubscribedUserIds } from "@/lib/store/push-subscriptions";
import type { Announcement, AnnouncementAudience, AnnouncementStatus } from "@/lib/types";

export async function listAnnouncements(): Promise<Announcement[]> {
  const snap = await announcementsCol.get();
  return snap.docs
    .map(withId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listSentAnnouncements(): Promise<Announcement[]> {
  const all = await listAnnouncements();
  return all.filter((a) => a.status === "sent");
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const doc = await announcementsCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data()! };
}

export async function createAnnouncementDraft(data: {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  selectedUserIds: string[];
  createdById: string;
}): Promise<Announcement> {
  const ref = announcementsCol.doc();
  const now = new Date().toISOString();
  const announcement: Omit<Announcement, "id"> = {
    title: data.title,
    body: data.body,
    audience: data.audience,
    selectedUserIds: data.audience === "users" ? data.selectedUserIds : [],
    status: "draft",
    createdById: data.createdById,
    createdAt: now,
  };
  await ref.set(announcement);
  return { id: ref.id, ...announcement };
}

export async function updateAnnouncementDraft(
  id: string,
  data: {
    title: string;
    body: string;
    audience: AnnouncementAudience;
    selectedUserIds: string[];
  },
): Promise<void> {
  const ref = announcementsCol.doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("NOT_FOUND");
  if (existing.data()?.status !== "draft") throw new Error("ALREADY_SENT");

  await ref.update({
    title: data.title,
    body: data.body,
    audience: data.audience,
    selectedUserIds: data.audience === "users" ? data.selectedUserIds : [],
  });
}

export async function markAnnouncementSent(
  id: string,
  data: {
    sentById: string;
    pushSuccessCount: number;
    pushFailureCount: number;
  },
): Promise<void> {
  const ref = announcementsCol.doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("NOT_FOUND");
  if (existing.data()?.status === "sent") throw new Error("ALREADY_SENT");

  await ref.update({
    status: "sent" satisfies AnnouncementStatus,
    sentAt: new Date().toISOString(),
    sentById: data.sentById,
    pushSuccessCount: data.pushSuccessCount,
    pushFailureCount: data.pushFailureCount,
  });
}

export async function deleteAnnouncementDraft(id: string): Promise<void> {
  const ref = announcementsCol.doc(id);
  const existing = await ref.get();
  if (!existing.exists) return;
  if (existing.data()?.status !== "draft") throw new Error("ALREADY_SENT");
  await ref.delete();
}

/** 발송 대상 로그인 사용자 id (푸시는 구독 토큰 있는 사용자만 실제 수신). */
export async function resolveAnnouncementRecipientUserIds(
  audience: AnnouncementAudience,
  selectedUserIds: string[],
): Promise<string[]> {
  if (audience === "all") {
    return await listSubscribedUserIds();
  }
  if (audience === "leaders") {
    return await listCurrentLeaderUserIds();
  }
  return [...new Set(selectedUserIds)].filter(Boolean);
}

export function audienceLabel(audience: AnnouncementAudience): string {
  switch (audience) {
    case "all":
      return "전체 (알림 켠 사용자, 일반 성도 포함)";
    case "leaders":
      return "가장 (담당 가족 있는 리더)";
    case "users":
      return "선택한 사용자";
    default:
      return audience;
  }
}
