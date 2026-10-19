"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@/components/ui";

type ImportResult = { ok: false; error: string } | { ok: true; message: string };

export function FamilyFormationImport({
  action,
}: {
  action: (formData: FormData) => Promise<ImportResult>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setSummary(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setSummary(result.message);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div className="flex flex-col gap-6">
        <div>
          <Label>양식 파일</Label>
          <input name="file" type="file" accept=".xlsx" className="text-sm" />
        </div>
        <div>
          <Label>또는 구글 시트 주소</Label>
          <Input name="sheetUrl" placeholder="https://docs.google.com/spreadsheets/..." />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "넣는 중" : "편성 반영"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && <p className="text-sm text-stone-600">{summary}</p>}
    </form>
  );
}
