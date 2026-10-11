"use client";

import { useState, useTransition } from "react";
import { grantMeetingAttendance, setMeetingAttendeeKind } from "@/app/actions";
import {
  AppointMemberForm,
  type MemberChoice,
  type UnlinkedLeaderChoice,
} from "@/components/member-account-form";
import { Button, Card, CardHeader } from "@/components/ui";
import type { AttendeeKind } from "@/lib/types";

const selectClass =
  "rounded-lg border border-input bg-surface px-3 py-2 text-sm text-foreground focus:border-muted-foreground focus:outline-none focus:ring-1 focus:ring-muted-foreground";

export type CurrentAttendee = {
  id: string;
  name: string;
  attendeeKind: AttendeeKind;
};

export function MeetingAttendancePanel({
  members,
  unlinkedAttendees,
  current,
}: {
  members: MemberChoice[];
  unlinkedAttendees: UnlinkedLeaderChoice[];
  current: CurrentAttendee[];
}) {
  return (
    <Card>
      <CardHeader
        title="리더모임 참석 계정"
        subtitle="게스트는 가끔 앉는 형제자매입니다. 새가족팀원은 매주 리더모임에 나옵니다. 둘 다 모임 자료, 배정모자, 공지만 봅니다."
      />
      <div className="grid items-start gap-6 p-4 sm:p-5 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">게스트</h3>
          <AppointMemberForm
            members={members}
            unlinkedLeaders={unlinkedAttendees}
            action={grantMeetingAttendance}
            submitLabel="게스트로 연결"
            hidden={{ attendeeKind: "guest" }}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">새가족팀원</h3>
          <AppointMemberForm
            members={members}
            unlinkedLeaders={unlinkedAttendees}
            action={grantMeetingAttendance}
            submitLabel="새가족팀원으로 연결"
            hidden={{ attendeeKind: "new_family" }}
          />
        </div>
      </div>
      {current.length > 0 && (
        <ul className="divide-y divide-muted border-t border-border text-sm">
          {current.map((member) => (
            <KindRow key={member.id} member={member} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function KindRow({ member }: { member: CurrentAttendee }) {
  const [kind, setKind] = useState<AttendeeKind>(member.attendeeKind);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="space-y-2 px-4 py-3 sm:px-5">
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await setMeetingAttendeeKind(formData);
            if (!result.ok) setError(result.error);
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="memberId" value={member.id} />
        <span className="min-w-24 font-medium text-foreground">{member.name}</span>
        <select
          name="attendeeKind"
          value={kind}
          onChange={(event) => setKind(event.target.value as AttendeeKind)}
          className={selectClass}
        >
          <option value="guest">게스트</option>
          <option value="new_family">새가족팀원</option>
        </select>
        <Button type="submit" variant="secondary" size="sm" disabled={pending || kind === member.attendeeKind}>
          {pending ? "저장 중" : "구분 저장"}
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  );
}
