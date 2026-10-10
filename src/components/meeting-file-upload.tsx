"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadMeetingAsset } from "@/app/actions";
import { Button, Label } from "@/components/ui";
import { MAX_MEETING_ASSET_BYTES } from "@/lib/meeting-assets";
import type { MeetingAssetKind } from "@/lib/types";

type Props = {
  meetingId: string;
  kind: MeetingAssetKind;
  label: string;
  hint?: string;
};

export function MeetingFileUpload({ meetingId, kind, label, hint }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("파일을 선택해 주세요.");
      return;
    }
    if (file.size > MAX_MEETING_ASSET_BYTES) {
      setError("파일은 20MB 이하만 올릴 수 있습니다.");
      return;
    }

    const body = new FormData(form);
    setError(null);
    startTransition(async () => {
      const result = await uploadMeetingAsset(meetingId, kind, body);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 border-t border-muted pt-3">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input type="file" name="file" required disabled={pending} className="text-sm" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "올리는 중…" : "올리기"}
      </Button>
    </form>
  );
}
