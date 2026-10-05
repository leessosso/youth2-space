"use client";

import Link from "next/link";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Button, Input, Label } from "@/components/ui";
import { normalizePhone, phonesMatch } from "@/lib/phone";

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
        if (!String(formData.get("memberId") ?? "")) {
          setError("성도를 선택해 주세요.");
          return;
        }
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
      <MemberPicker
        members={choices}
        name="memberId"
        label={memberLabel}
        value={memberId}
        onValueChange={onMemberChange}
        note={(item) => (item.userId ? null : "계정 없음")}
      />
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
      <Button type="submit" disabled={pending || !memberId}>
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

function memberMatchesQuery(member: MemberChoice, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return false;
  if (member.name.toLowerCase().includes(text)) return true;
  const digits = normalizePhone(text);
  return Boolean(digits && member.phone && normalizePhone(member.phone).includes(digits));
}

function MemberPicker({
  members,
  name,
  label,
  value,
  onValueChange,
  phone,
  note,
}: {
  members: MemberChoice[];
  name: string;
  label: string;
  value: string;
  onValueChange: (id: string) => void;
  phone?: string | null;
  note?: (member: MemberChoice) => string | null;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = members.find((member) => member.id === value);
  const text = query.trim();
  const matches = members
    .filter((member) => (text ? memberMatchesQuery(member, text) : phonesMatch(member.phone, phone)))
    .sort((a, b) => {
      const aMatch = phonesMatch(a.phone, phone) ? 0 : 1;
      const bMatch = phonesMatch(b.phone, phone) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.name.localeCompare(b.name, "ko");
    });
  const shown = matches.slice(0, 20);

  function choose(member: MemberChoice) {
    onValueChange(member.id);
    setQuery(member.name);
    setOpen(false);
  }

  return (
    <div className="min-w-48 flex-1">
      <Label htmlFor={`${listId}-input`}>{label}</Label>
      <input type="hidden" name={name} value={value} />
      <Input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        placeholder="이름을 입력하세요"
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(0);
          if (selected && event.target.value.trim() !== selected.name) onValueChange("");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(shown.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && shown[activeIndex]) {
            event.preventDefault();
            choose(shown[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-stone-200 bg-white text-sm">
          {shown.map((member, index) => {
            const extra = [
              phonesMatch(member.phone, phone) ? "전화번호 일치" : null,
              note?.(member),
            ].filter(Boolean);
            return (
              <li key={member.id} role="option" aria-selected={member.id === value}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left ${index === activeIndex ? "bg-stone-100" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => choose(member)}
                >
                  <span className="font-medium text-stone-900">{member.name}</span>
                  {extra.length > 0 && <span className="shrink-0 text-xs text-stone-500">{extra.join(" · ")}</span>}
                </button>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="px-3 py-2 text-stone-500">{text ? "해당하는 성도가 없습니다." : "이름을 입력하세요."}</li>
          )}
          {matches.length > shown.length && (
            <li className="px-3 py-2 text-xs text-stone-500">앞 {shown.length}명만 보입니다. 이름을 더 입력해 주세요.</li>
          )}
        </ul>
      )}
    </div>
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
  const [memberId, setMemberId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="space-y-3 px-4 py-3 sm:px-5">
      <div>
        <p className="text-sm font-medium text-stone-900">{leader.name}</p>
        <p className="text-xs text-stone-500">
          {leader.email}
          {leader.phone ? ` · ${leader.phone}` : ""}
        </p>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-stone-600">연결할 성도가 없습니다. 명단에 이름을 먼저 추가해 주세요.</p>
      ) : (
        <form
          action={(formData) => {
            setError(null);
            if (!String(formData.get("memberId") ?? "")) {
              setError("성도를 선택해 주세요.");
              return;
            }
            startTransition(async () => {
              const result = await action(formData);
              if (!result.ok) setError(result.error);
            });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="userId" value={leader.id} />
          <MemberPicker
            members={members}
            name="memberId"
            label="연결할 성도"
            value={memberId}
            onValueChange={setMemberId}
            phone={leader.phone}
          />
          <Button type="submit" disabled={pending || !memberId}>
            {pending ? "연결 중" : "연결"}
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </li>
  );
}
