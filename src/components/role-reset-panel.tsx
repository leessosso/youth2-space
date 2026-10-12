"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Person = { id: string; name: string; detail: string };

/** 초기화 대상 미리보기 + 확인 대화상자. 서버는 미리보기 id 목록과 다시 계산한 대상이 같을 때만 실행한다. */
export function RoleResetPanel({
  title,
  description,
  people,
  confirmLabel,
  action,
}: {
  title: string;
  description: string;
  people: Person[];
  confirmLabel: string;
  action: (expectedUserIds: string[]) => Promise<{ ok: boolean; error?: string; count?: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "destructive"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action(people.map((p) => p.id));
      setOpen(false);
      if (result.ok) {
        setMessage({ tone: "success", text: `${result.count ?? people.length}명을 초기화했습니다.` });
        router.refresh();
      } else {
        setMessage({ tone: "destructive", text: result.error ?? "실패했습니다." });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">대상이 없습니다.</p>
      ) : (
        <ul className="max-h-48 divide-y divide-muted overflow-y-auto rounded-lg border border-border text-sm">
          {people.map((p) => (
            <li key={p.id} className="flex justify-between gap-3 px-3 py-2">
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-muted-foreground">{p.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button
        type="button"
        variant="danger"
        disabled={people.length === 0 || pending}
        onClick={() => setOpen(true)}
      >
        {confirmLabel} ({people.length}명)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmLabel}</DialogTitle>
            <DialogDescription>
              위 목록의 {people.length}명에게 적용합니다. 되돌리려면 다시 임명해야 합니다. 계속할까요?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              취소
            </Button>
            <Button type="button" variant="danger" onClick={run} disabled={pending}>
              {pending ? "처리 중…" : `${people.length}명 ${confirmLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
