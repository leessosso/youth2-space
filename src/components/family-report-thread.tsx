"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendFamilyReportMessage } from "@/app/actions";
import { Button, Textarea } from "@/components/ui";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string; role: string };
  aboutMemberId: string | null;
};

export function FamilyReportThread({
  groupId,
  members,
  messages,
}: {
  groupId: string;
  members: { id: string; name: string }[];
  messages: Message[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [aboutMemberId, setAboutMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await sendFamilyReportMessage(groupId, body, aboutMemberId || null);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <div className="max-h-[60vh] space-y-2 overflow-y-auto bg-background px-2 py-2 sm:px-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">첫 가족 현황을 남겨 주세요.</p>
        )}
        {messages.map((m) => {
          const isPastor = m.author.role === "PASTOR" || m.author.role === "ADMIN";
          const tag = memberName(m.aboutMemberId);
          return (
            <div
              key={m.id}
              className={`w-fit max-w-[96%] rounded-xl px-3 py-2 text-sm ${
                isPastor
                  ? "ml-auto bg-info-muted text-foreground"
                  : "bg-surface text-foreground shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium opacity-70">{m.author.name}</p>
                {tag && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {tag}
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {new Date(m.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="space-y-2 border-t border-muted px-2 py-2 sm:px-3">
        {members.length > 0 && (
          <select
            value={aboutMemberId}
            onChange={(e) => setAboutMemberId(e.target.value)}
            className="rounded-lg border border-input px-3 py-2 text-sm"
          >
            <option value="">가족 전체</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="가족 현황, 기도 제목, 상담 요청 등"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">보내기</Button>
      </form>
    </div>
  );
}
