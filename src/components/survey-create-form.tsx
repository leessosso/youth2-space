"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

const QUESTION_ROWS = [1, 2, 3, 4, 5, 6];

type SurveyMode = "participation" | "questions";

type CreateResult = { error: string } | { ok: true; id: string };

export function SurveyCreateForm({
  action,
}: {
  action: (formData: FormData) => Promise<CreateResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<SurveyMode>("participation");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setMode("participation");
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-3">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium text-stone-700">방식</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="participation"
            checked={mode === "participation"}
            onChange={() => setMode("participation")}
            className="mt-0.5 border-input"
          />
          <span>
            <span className="font-medium text-stone-800">가족 참여만</span>
            <span className="mt-0.5 block text-muted-foreground">가족원마다 참여 여부를 예/아니오로 받습니다.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="mode"
            value="questions"
            checked={mode === "questions"}
            onChange={() => setMode("questions")}
            className="mt-0.5 border-input"
          />
          <span>
            <span className="font-medium text-stone-800">질문 조사</span>
            <span className="mt-0.5 block text-muted-foreground">예/아니오, 인원, 메모 질문을 직접 만듭니다.</span>
          </span>
        </label>
      </fieldset>

      <div>
        <Label>제목</Label>
        <Input name="title" required placeholder="수요예배 참석, 추석 식수" />
      </div>
      <div>
        <Label>날짜</Label>
        <Input name="eventDate" type="date" required />
      </div>
      <div>
        <Label>설명</Label>
        <Textarea name="description" placeholder="가족원마다 응답해 주세요" />
      </div>

      {mode === "participation" ? (
        <div>
          <Label>참여 항목</Label>
          <Input name="participationLabel" defaultValue="참여" placeholder="참여" />
          <p className="mt-1 text-xs text-muted-foreground">
            가족원 이름 옆에 이 항목이 체크박스로 나옵니다. 예: 참석 예정, 식사
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>질문 (최대 6개, 빈 칸은 무시)</Label>
          {QUESTION_ROWS.map((i) => (
            <div key={i} className="flex gap-2">
              <Input name={`q${i}_label`} placeholder={`질문 ${i} (예: 식수 인원)`} />
              <select
                name={`q${i}_type`}
                defaultValue="yesno"
                className="rounded-lg border border-input px-2 py-2 text-sm"
              >
                <option value="yesno">예/아니오</option>
                <option value="number">인원(숫자)</option>
                <option value="text">메모</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중" : "만들기"}
      </Button>
    </form>
  );
}
