import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kstDateKeyNow } from "@/lib/kst-date";
import { canViewMeetingAsset, getAssetPreviewKind } from "@/lib/meeting-assets";
import { guestCanOpenMeeting, isScopedMeetingGuest } from "@/lib/meeting-guest";
import { getMeetingAssetById, getMeetingById } from "@/lib/store/meetings";
import { getUserById } from "@/lib/store/users";
import {
  getAuthenticatedAssetPath,
  getMeetingFileBlob,
} from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ meetingId: string; assetId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const actor = await getUserById(session.user.id);
  if (!actor) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { meetingId, assetId } = await params;
  const asset = await getMeetingAssetById(assetId);
  if (!asset || asset.meetingId !== meetingId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!canViewMeetingAsset(asset, actor)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (isScopedMeetingGuest(actor)) {
    const meeting = await getMeetingById(meetingId);
    if (!meeting || !guestCanOpenMeeting(meeting, actor.id, kstDateKeyNow())) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get("intent") === "preview") {
    return NextResponse.json({
      url: getAuthenticatedAssetPath(meetingId, assetId),
      previewKind: getAssetPreviewKind(asset.fileName),
      fileName: asset.fileName,
    });
  }

  const blobResult = await getMeetingFileBlob(asset.storageKey);
  if (!blobResult) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const contentType =
    blobResult.blob.contentType ??
    blobResult.headers.get("content-type") ??
    "application/octet-stream";

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };

  if (searchParams.get("download") === "1") {
    const encoded = encodeURIComponent(asset.fileName);
    headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encoded}`;
  }

  return new NextResponse(blobResult.stream, { headers });
}
