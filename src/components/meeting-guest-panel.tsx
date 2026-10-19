"use client";

import { useState, useTransition } from "react";
import { placeMemberAsMeetingGuest, removeMeetingGuest } from "@/app/actions";
import {
  AppointMemberForm,
  type MemberChoice,
  type UnlinkedLeaderChoice,
} from "@/components/member-account-form";
import { Button, Card, CardHeader } from "@/components/ui";

export type MeetingGuestChoice = {
  id: string;
  name: string;
};

export function MeetingGuestPanel({
  meetingId,
  guests,
  members,
  unlinkedGuests,
  dayOpen,
}: {
  meetingId: string;
  guests: MeetingGuestChoice[];
  members: MemberChoice[];
  unlinkedGuests: UnlinkedLeaderChoice[];
  dayOpen: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader
        title="이번 모임 게스트"
        subtitle="성도를 고릅니다. 계정이 없으면 만들면서 이 모임에 넣고, 있으면 다시 만들지 않고 이 모임에만 넣습니다. 모임 날(서울)까지 이 모임, 공지, 배정모자를 보고, 그 날이 지나면 접근이 닫힙니다. 계정은 지우지 않습니다."
      />
      {guests.length > 0 && (
        <ul className="divide-y divide-muted border-b border-border text-sm">
          {guests.map((guest) => (
            <li key={guest.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="font-medium text-foreground">{guest.name}</span>
              <form
                action={(formData) => {
                  setError(null);
                  startTransition(async () => {
                    const result = await removeMeetingGuest(meetingId, String(formData.get("userId") ?? ""));
                    if (!result.ok) setError(result.error);
                  });
                }}
              >
                <input type="hidden" name="userId" value={guest.id} />
                <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                  빼기
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-3 p-4 sm:p-5">
        <AppointMemberForm
          members={members}
          unlinkedLeaders={unlinkedGuests}
          action={(formData) => placeMemberAsMeetingGuest(meetingId, formData)}
          submitLabel="계정 만들고 넣기"
          submitLabelWhenLinked="이 모임에 넣기"
          linkedMessage="계정이 있습니다. 다시 만들지 않고 이 모임에만 넣습니다."
          memberNote={(member) => (member.userId ? "계정 있음" : "계정 없음")}
          emptyMessage="가장·임원이 아닌 성도가 없습니다. 부가장을"
        />
        {!dayOpen && (
          <p className="text-sm text-muted-foreground">이 모임 날은 지나서, 지금 넣어도 열리지 않습니다.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Card>
  );
}
