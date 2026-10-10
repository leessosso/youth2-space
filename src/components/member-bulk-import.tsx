"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Label, Textarea } from "@/components/ui";

type ImportResult =
  | { ok: false; error: string }
  | { ok: true; added: number; skipped: number };

export function MemberBulkImport({
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
      const skipped = result.skipped > 0 ? ` 이미 있는 이름 ${result.skipped}명은 건너뛰었습니다.` : "";
      setSummary(`${result.added}명을 넣었습니다.${skipped}`);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3">
      <div>
        <Label>이름 목록</Label>
        <Textarea
          name="text"
          rows={8}
          placeholder={"김민수\n정하늘, 010-0000-0000"}
        />
      </div>
      <div>
        <Label>또는 파일</Label>
        <input name="file" type="file" accept=".csv,.txt,.xlsx,.xls" className="text-sm" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "넣는 중" : "한꺼번에 넣기"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {summary && <p className="text-sm text-stone-600">{summary}</p>}
    </form>
  );
}
