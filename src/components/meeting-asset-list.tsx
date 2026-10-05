"use client";

import { useCallback, useState } from "react";
import {
  publishMeetingCommentary,
  unpublishMeetingCommentary,
} from "@/app/actions";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAssetPreviewKind,
  isCommentaryAssetPublished,
  type AssetPreviewKind,
} from "@/lib/meeting-assets";
import type { MeetingAsset } from "@/lib/types";

type Props = {
  meetingId: string;
  assets: MeetingAsset[];
  emptyLabel: string;
  canPublishCommentary: boolean;
};

export function MeetingAssetList({
  meetingId,
  assets,
  emptyLabel,
  canPublishCommentary,
}: Props) {
  const [preview, setPreview] = useState<{
    url: string;
    kind: AssetPreviewKind;
    fileName: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const closePreview = useCallback(() => {
    setPreview(null);
    setPreviewError(null);
  }, []);


  async function openPreview(asset: MeetingAsset) {
    const localKind = getAssetPreviewKind(asset.fileName);
    if (localKind === "none") return;

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await fetch(
        `/api/meetings/${meetingId}/assets/${asset.id}?intent=preview`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          body?.error === "FORBIDDEN"
            ? "열람 권한이 없습니다."
            : "미리보기를 불러오지 못했습니다.",
        );
      }
      const data = (await res.json()) as {
        url: string;
        previewKind: AssetPreviewKind;
        fileName: string;
      };
      if (data.previewKind === "none") {
        setPreviewError("이 형식은 미리보기를 지원하지 않습니다. 다운로드해 주세요.");
        return;
      }
      setPreview({ url: data.url, kind: data.previewKind, fileName: data.fileName });
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "미리보기를 불러오지 못했습니다.");
    } finally {
      setPreviewLoading(false);
    }
  }

  if (assets.length === 0) {
    return <p className="text-sm text-stone-500">{emptyLabel}</p>;
  }

  return (
    <>
      <ul className="space-y-2">
        {assets.map((asset) => {
          const previewKind = getAssetPreviewKind(asset.fileName);
          const isCommentary = asset.kind === "LESSON_COMMENTARY";
          const published = isCommentaryAssetPublished(asset);

          return (
            <li
              key={asset.id}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900">{asset.fileName}</p>
                  {isCommentary && !published && (
                    <p className="mt-0.5 text-xs text-amber-700">
                      비공개 — 가장에게는 공개 후에만 보입니다.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {previewKind !== "none" && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      disabled={previewLoading}
                      onClick={() => openPreview(asset)}
                    >
                      미리보기
                    </Button>
                  )}
                  <a
                    href={`/api/meetings/${meetingId}/assets/${asset.id}?download=1`}
                    className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 transition hover:bg-stone-50"
                  >
                    다운로드
                  </a>
                  {isCommentary && canPublishCommentary && (
                    published ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => void unpublishMeetingCommentary(meetingId, asset.id)}
                      >
                        비공개로 되돌리기
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className="px-3 py-1.5 text-xs"
                        onClick={() => void publishMeetingCommentary(meetingId, asset.id)}
                      >
                        공개
                      </Button>
                    )
                  )}
                </div>
              </div>
              {previewKind === "none" && (
                <p className="mt-1 text-xs text-stone-500">
                  이 형식은 미리보기를 지원하지 않습니다. 다운로드만 가능합니다.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {previewError && (
        <p className="mt-2 text-sm text-red-700" role="alert">{previewError}</p>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent
          showCloseButton={false}
          className="flex h-[min(90vh,100%)] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
          aria-label={preview ? `${preview.fileName} 미리보기` : undefined}
        >
          <DialogHeader className="flex-row items-center justify-between space-y-0 border-b border-border px-3 py-2 sm:px-4">
            <DialogTitle className="truncate text-sm font-medium">
              {preview?.fileName}
            </DialogTitle>
            <Button type="button" variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={closePreview}>
              닫기
            </Button>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto bg-stone-100 p-2 sm:p-3">
            {preview?.kind === "pdf" ? (
              <iframe
                title={preview.fileName}
                src={preview.url}
                className="h-[min(80vh,100%)] w-full min-h-[50vh] rounded-lg border border-stone-200 bg-white"
              />
            ) : preview ? (
              <img
                src={preview.url}
                alt={preview.fileName}
                className="mx-auto max-h-[min(80vh,100%)] w-auto max-w-full rounded-lg object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
