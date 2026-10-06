"use client";

import { useState } from "react";
import { linkMemberAccount } from "@/app/actions";
import { UnlinkedLeaderLinks, type UnlinkedLeaderChoice } from "@/components/member-account-form";
import { Badge, Card, CardHeader } from "@/components/ui";

type RosterMember = {
  id: string;
  name: string;
  phone: string | null;
  userId: string | null;
  groupId: string;
};

export function MemberRosterLists({
  members: initialMembers,
  unlinkedLeaders: initialLeaders,
  currentGroupIds,
  leaderIds,
  officerTitles,
  groupNames,
}: {
  members: RosterMember[];
  unlinkedLeaders: UnlinkedLeaderChoice[];
  currentGroupIds: string[];
  leaderIds: string[];
  officerTitles: Record<string, string>;
  groupNames: Record<string, string>;
}) {
  const serverStamp = [
    initialMembers.map((member) => `${member.id}:${member.userId ?? ""}:${member.groupId}`).join(","),
    initialLeaders.map((leader) => leader.id).join(","),
  ].join("|");
  const [stamp, setStamp] = useState(serverStamp);
  const [members, setMembers] = useState(initialMembers);
  const [leaders, setLeaders] = useState(initialLeaders);

  if (stamp !== serverStamp) {
    setStamp(serverStamp);
    setMembers(initialMembers);
    setLeaders(initialLeaders);
  }

  const leaderIdSet = new Set(leaderIds);
  const groupIdSet = new Set(currentGroupIds);
  const unassigned = members.filter((member) => !groupIdSet.has(member.groupId));
  const choices = members.map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    userId: member.userId,
  }));

  function memberBadges(member: RosterMember) {
    const title = member.userId ? officerTitles[member.userId] : undefined;
    return (
      <span className="flex flex-wrap items-center gap-1">
        {member.userId && <Badge>계정</Badge>}
        {member.userId && leaderIdSet.has(member.userId) && <Badge tone="green">가장</Badge>}
        {title && <Badge tone="blue">{title}</Badge>}
      </span>
    );
  }

  function onLinked(userId: string, memberId: string) {
    setLeaders((current) => current.filter((leader) => leader.id !== userId));
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, userId } : member)),
    );
  }

  return (
    <>
      {leaders.length > 0 && (
        <Card>
          <CardHeader
            title={`성도와 연결되지 않은 계정 ${leaders.length}명`}
            subtitle="가장·임원으로 쓰려면 성도 한 명과 연결합니다. 전화번호가 같은 성도는 목록 위에 표시됩니다."
          />
          <UnlinkedLeaderLinks
            leaders={leaders}
            members={choices}
            action={linkMemberAccount}
            onLinked={onLinked}
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title={`아직 가족이 없는 사람 ${unassigned.length}명`}
          subtitle="가족 화면에서 이번 학기 가족으로 옮깁니다"
        />
        <ul className="divide-y divide-stone-100 text-sm">
          {unassigned.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
              <span className="font-medium text-stone-900">{member.name}</span>
              <span className="flex items-center gap-2">
                {member.phone && <span className="text-stone-500">{member.phone}</span>}
                {memberBadges(member)}
              </span>
            </li>
          ))}
          {unassigned.length === 0 && <li className="px-4 py-6 text-stone-500 sm:px-5">아직 없습니다.</li>}
        </ul>
      </Card>

      <Card>
        <CardHeader title={`전체 성도 ${members.length}명`} subtitle="계정, 이번 학기 가장, 올해 임원" />
        <ul className="divide-y divide-stone-100 text-sm">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
              <span>
                <span className="font-medium text-stone-900">{member.name}</span>
                <span className="text-stone-500"> · {groupNames[member.groupId] ?? "미배정"}</span>
              </span>
              {memberBadges(member)}
            </li>
          ))}
          {members.length === 0 && <li className="px-4 py-6 text-stone-500 sm:px-5">아직 없습니다.</li>}
        </ul>
      </Card>
    </>
  );
}
