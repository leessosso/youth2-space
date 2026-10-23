import { canManageApp, meetingDutyUserId, type LeaderMeeting, type MeetingAsset, type User } from "@/lib/types";

/** 교안·해설지·악보 한 파일 상한. 서버 액션 본문 제한(25MB)보다 작게 둔다. */
export const MAX_MEETING_ASSET_BYTES = 20 * 1024 * 1024;

export function isCommentaryAssetPublished(asset: MeetingAsset): boolean {
  if (asset.kind !== "LESSON_COMMENTARY") return true;
  return asset.published === true;
}

/** 모임 자료 열람·다운로드·미리보기 권한 */
export function canViewMeetingAsset(
  asset: MeetingAsset,
  viewer: Pick<User, "id" | "role" | "officerTitle">,
): boolean {
  if (isCommentaryAssetPublished(asset)) return true;
  return canManageApp(viewer) || asset.uploadedById === viewer.id;
}

export type AssetPreviewKind = "pdf" | "image" | "none";

export function getAssetPreviewKind(fileName: string): AssetPreviewKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lower)) return "image";
  return "none";
}

export const SCORE_UPLOAD_NOTICE = "악보는 이번 기도회 인도자와 임원만 올릴 수 있어요.";

/**
 * 악보 업로드 권한: 그 모임의 기도회 인도자(`dutyUserIds.prayer_meeting_lead` / `prayerLeaderId`)
 * 또는 임원·목사·관리자(`canManageApp`). 인도자가 미지정이어도 임원은 올릴 수 있다.
 */
export function canUploadMeetingScore(
  meeting: LeaderMeeting,
  actor: Pick<User, "id" | "role" | "officerTitle"> | null,
): boolean {
  if (!actor) return false;
  if (canManageApp(actor)) return true;
  const leaderId = meetingDutyUserId(meeting, "prayer_meeting_lead");
  return leaderId != null && leaderId === actor.id;
}
