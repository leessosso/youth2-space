"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { Button, Input, Label } from "@/components/ui";
import { phonesMatch } from "@/lib/phone";

type ActionResult = { ok: true } | { ok: false; error: string };

export type MemberChoice = {
  id: string;
  name: string;
  phone: string | null;
  userId: string | null;
};

export type UnlinkedLeaderChoice = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

const selectClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500";

export function AppointMemberForm({
  members,
  unlinkedLeaders,
  action,
  submitLabel,
  memberLabel = "성도",
  excludeUserId,
  hidden,
  children,
}: {
  members: MemberChoice[];
  unlinkedLeaders: UnlinkedLeaderChoice[];
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  memberLabel?: string;
  excludeUserId?: string | null;
  hidden?: Record<string, string>;
  children?: ReactNode;
}) {
  const choices = members.filter((member) => !excludeUserId || member.userId !== excludeUserId);
  const [memberId, setMemberId] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [linkUserId, setLinkUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const member = choices.find((item) => item.id === memberId);
  const needsAccount = Boolean(member && !member.userId);
  const phoneMatches = needsAccount
    ? unlinkedLeaders.filter((leader) => phonesMatch(leader.phone, member?.phone))
    : [];

  function onMemberChange(id: string) {
    setMemberId(id);
    const next = choices.find((item) => item.id === id);
    if (!next || next.userId) {
      setMode("new");
      setLinkUserId("");
      return;
    }
    const matches = unlinkedLeaders.filter((leader) => phonesMatch(leader.phone, next.phone));
    if (matches.length > 0) {
      setMode("existing");
      setLinkUserId(matches.length === 1 ? matches[0].id : "");
      return;
    }
    setMode("new");
    setLinkUserId("");
  }

  if (choices.length === 0) {
    return (
      <div className="space-y-3">
        {children}
        <p className="text-sm text-stone-600">
          성도 명단에 앉힐 사람이 없습니다.{" "}
          <Link href="/admin/members" className="font-medium text-stone-900 underline">
            성도 명단
          </Link>
          에서 먼저 추가해 주세요.
        </p>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (!result.ok) setError(result.error);
        });
      }}
      className="space-y-3"
    >
      {hidden &&
        Object.entries(hidden).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      {children}
      <div>
        <Label>{memberLabel}</Label>
        <select
          name="memberId"
          required
          value={memberId}
          onChange={(event) => onMemberChange(event.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            선택
          </option>
          {choices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.userId ? "" : " · 계정 없음"}
            </option>
          ))}
        </select>
      </div>
      {member?.userId && <p className="text-sm text-stone-600">이 성도는 로그인 계정이 연결되어 있습니다.</p>}
      {needsAccount && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-stone-900">로그인 계정</legend>
          {phoneMatches.length > 0 && (
            <p className="text-sm text-stone-600">
              전화번호가 같은 계정이 있습니다. 연결하면 새 계정을 만들지 않습니다.
            </p>
          )}
          {unlinkedLeaders.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-stone-800">
              <input
                type="radio"
                name="accountMode"
                value="existing"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
              />
              기존 계정 연결
            </label>
          )}
          {mode === "existing" && unlinkedLeaders.length > 0 && (
            <select
              name="linkUserId"
              required
              value={linkUserId}
              onChange={(event) => setLinkUserId(event.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                계정 선택
              </option>
              {[...unlinkedLeaders]
                .sort((a, b) => {
                  const aMatch = phonesMatch(a.phone, member?.phone) ? 0 : 1;
                  const bMatch = phonesMatch(b.phone, member?.phone) ? 0 : 1;
                  if (aMatch !== bMatch) return aMatch - bMatch;
                  return a.name.localeCompare(b.name, "ko");
                })
                .map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                    {phonesMatch(leader.phone, member?.phone) ? " · 전화번호 일치" : ""} ({leader.email})
                  </option>
                ))}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm text-stone-800">
            <input
              type="radio"
              name="accountMode"
              value="new"
              checked={mode === "new"}
              onChange={() => setMode("new")}
            />
            새 계정 만들기
          </label>
          {mode === "new" && (
            <div className="grid gap-2">
              <Input name="email" type="email" required autoComplete="off" placeholder="이메일 (연락용)" />
              <Input
                key={member?.id}
                name="phone"
                type="tel"
                required
                autoComplete="off"
                defaultValue={member?.phone ?? ""}
                placeholder="전화번호 (로그인용)"
              />
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="처음 비밀번호"
              />
            </div>
          )}
        </fieldset>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중" : submitLabel}
      </Button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}

export function UnlinkedLeaderLinks({
  leaders,
  members,
  action,
}: {
  leaders: UnlinkedLeaderChoice[];
  members: MemberChoice[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const openMembers = members.filter((member) => !member.userId);
  if (leaders.length === 0) return null;

  return (
    <ul className="divide-y divide-stone-100">
      {leaders.map((leader) => (
        <LeaderLinkRow key={leader.id} leader={leader} members={openMembers} action={action} />
      ))}
    </ul>
  );
}

function LeaderLinkRow({
  leader,
  members,
  action,
}: {
  leader: UnlinkedLeaderChoice;
  members: MemberChoice[];
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ordered = [...members].sort((a, b) => {
    const aMatch = phonesMatch(a.phone, leader.phone) ? 0 : 1;
    const bMatch = phonesMatch(b.phone, leader.phone) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name, "ko");
  });

  return (
    <li className="space-y-3 px-4 py-3 sm:px-5">
      <div>
        <p className="text-sm font-medium text-stone-900">{leader.name}</p>
        <p className="text-xs text-stone-500">
          {leader.email}
          {leader.phone ? ` · ${leader.phone}` : ""}
        </p>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-stone-600">연결할 성도가 없습니다. 명단에 이름을 먼저 추가해 주세요.</p>
      ) : (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) setError(result.error);
            });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="userId" value={leader.id} />
          <div className="min-w-48 flex-1">
            <Label>연결할 성도</Label>
            <select name="memberId" required defaultValue="" className={selectClass}>
              <option value="" disabled>
                선택
              </option>
              {ordered.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {phonesMatch(member.phone, leader.phone) ? " · 전화번호 일치" : ""}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "연결 중" : "연결"}
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </li>
  );
}
