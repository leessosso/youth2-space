"use client";

import { useState, useTransition } from "react";
import { appointOfficerFromMember, vacateOfficerAction } from "@/app/actions";
import { AppointMemberForm, type MemberChoice, type UnlinkedLeaderChoice } from "@/components/member-account-form";
import { Button } from "@/components/ui";
import { OFFICER_TITLES, type OfficerTitle } from "@/lib/types";

export function OfficerYearBoard({
  year,
  half,
  seats,
  members,
  unlinkedLeaders,
  isPastor,
}: {
  year: number;
  half: "H1" | "H2";
  seats: { title: OfficerTitle; name: string | null; email: string | null; userId: string | null }[];
  members: MemberChoice[];
  unlinkedLeaders: UnlinkedLeaderChoice[];
  isPastor: boolean;
}) {
  const filled = new Set(seats.map((seat) => seat.userId).filter(Boolean));
  const openMembers = members.filter((member) => !member.userId || !filled.has(member.userId));
  const subtitle =
    half === "H2"
      ? "하반기에는 임원을 다시 짜지 않습니다. 빈 자리는 목사만 채웁니다. 임원도 성도 명단에서 고릅니다."
      : "올해 임원입니다. 목사가 성도 명단에서 직책을 앉히면, 그 임원이 가족과 가장을 구성합니다.";

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">{year}년 임원</h3>
        <p className="text-sm text-stone-600">{subtitle}</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {OFFICER_TITLES.map((title) => {
          const seat = seats.find((item) => item.title === title);
          return (
            <li key={title} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-medium text-foreground">{title}</p>
              {seat?.userId ? (
                <FilledSeat title={title} name={seat.name ?? "알 수 없음"} email={seat.email} isPastor={isPastor} />
              ) : (
                <EmptySeat title={title} members={openMembers} unlinkedLeaders={unlinkedLeaders} isPastor={isPastor} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FilledSeat({
  title,
  name,
  email,
  isPastor,
}: {
  title: OfficerTitle;
  name: string;
  email: string | null;
  isPastor: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm text-stone-800">{name}</p>
        {email && <p className="text-xs text-muted-foreground">{email}</p>}
      </div>
      {isPastor && (
        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await vacateOfficerAction(formData);
              if (!result.ok) setError(result.error);
            });
          }}
        >
          <input type="hidden" name="title" value={title} />
          <Button type="submit" variant="secondary" disabled={pending}>
            비우기
          </Button>
        </form>
      )}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}

function EmptySeat({
  title,
  members,
  unlinkedLeaders,
  isPastor,
}: {
  title: OfficerTitle;
  members: MemberChoice[];
  unlinkedLeaders: UnlinkedLeaderChoice[];
  isPastor: boolean;
}) {
  if (!isPastor) {
    return <p className="mt-2 text-sm text-muted-foreground">비어 있음</p>;
  }

  return (
    <div className="mt-3">
      <AppointMemberForm
        members={members}
        unlinkedLeaders={unlinkedLeaders}
        action={appointOfficerFromMember}
        submitLabel="임명"
        memberLabel="성도"
        hidden={{ title }}
      />
    </div>
  );
}
