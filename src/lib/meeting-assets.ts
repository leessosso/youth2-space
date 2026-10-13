import { canManageApp, type MeetingAsset, type User } from "@/lib/types";

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
  // 리더모임 자료는 리더·참석 계정만. 일반 성도(MEMBER)는 공개 자료도 보지 않는다.
  if (viewer.role === "MEMBER") return false;
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
