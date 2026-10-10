import Link from "next/link";
import { redirect } from "next/navigation";
import { createMember, importGroupMembers } from "@/app/actions";
import { MemberBulkImport } from "@/components/member-bulk-import";
import { MemberRosterLists } from "@/components/member-roster-lists";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { termLabel } from "@/lib/format";
import { listAllMembers, listGroups } from "@/lib/store/groups";
import { listActiveOfficers } from "@/lib/store/officers";
import { getCurrentTerm } from "@/lib/store/settings";
import { getUsersByIds, listUsersByRole } from "@/lib/store/users";

export default async function MemberRosterPage() {
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const [term, groups, members, leaders] = await Promise.all([
    getCurrentTerm(),
    listGroups(),
    listAllMembers(),
    listUsersByRole("LEADER"),
  ]);
  const [appointments, leaderNames] = await Promise.all([
    listActiveOfficers(term.year),
    getUsersByIds(groups.map((group) => group.currentLeaderId ?? "")),
  ]);
  const leaderIds = new Set(groups.map((group) => group.currentLeaderId).filter((id): id is string => Boolean(id)));
  const officerTitleByUser = new Map(appointments.map((appointment) => [appointment.userId, appointment.title]));
  const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
  const memberChoices = members.map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    userId: member.userId,
  }));
  const linkedUserIds = new Set(memberChoices.flatMap((member) => (member.userId ? [member.userId] : [])));
  const unlinkedLeaders = leaders
    .filter((leader) => !linkedUserIds.has(leader.id))
    .map((leader) => ({ id: leader.id, name: leader.name, email: leader.email, phone: leader.phone }));

  const families = groups.map((group) => {
    const leaderName = group.currentLeaderId ? leaderNames.get(group.currentLeaderId)?.name : undefined;
    const count = members.filter((member) => member.groupId === group.id).length;
    return {
      id: group.id,
      name: group.name,
      leaderName: leaderName ?? "미배정",
      count,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">성도 명단</h2>
        <p className="text-sm text-stone-600">
          {termLabel(term)} 가족에 넣기 전에 이름을 모아 둡니다. 가장과 임원도 이 명단의 사람이며, 앱에 들어가려면 계정을 연결합니다.
          가족 배정은 가족 화면에서 합니다.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="text-sm font-medium text-foreground">한꺼번에 넣기</h3>
          <p className="mt-1 text-sm text-stone-600">
            한 줄에 한 명씩 붙여 넣거나, CSV·엑셀 파일을 올립니다. 연락처는 이름 옆 둘째 칸입니다. 이미 명단에 있는 이름은 건너뜁니다.
          </p>
          <div className="mt-3">
            <MemberBulkImport action={importGroupMembers} />
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-medium text-foreground">한 명 추가</h3>
          <form
            action={async (formData) => {
              "use server";
              await createMember(
                String(formData.get("name") ?? ""),
                String(formData.get("phone") ?? "") || undefined,
              );
            }}
            className="mt-3 space-y-3"
          >
            <div>
              <Label>이름</Label>
              <Input name="name" required placeholder="이름" />
            </div>
            <div>
              <Label>연락처</Label>
              <Input name="phone" placeholder="연락처" />
            </div>
            <Button type="submit">추가</Button>
          </form>
        </Card>
      </div>

      <MemberRosterLists
        members={members.map((member) => ({
          id: member.id,
          name: member.name,
          phone: member.phone,
          userId: member.userId,
          groupId: member.groupId,
        }))}
        unlinkedLeaders={unlinkedLeaders}
        currentGroupIds={groups.map((group) => group.id)}
        leaderIds={[...leaderIds]}
        officerTitles={Object.fromEntries(officerTitleByUser)}
        groupNames={Object.fromEntries(groupNameById)}
      />

      {families.length > 0 && (
        <Card>
          <CardHeader title="이번 학기 가족" subtitle="가족 화면에서 가족원을 배정합니다" />
          <ul className="divide-y divide-muted text-sm">
            {families.map((family) => (
              <li key={family.id}>
                <Link
                  href={`/groups/${family.id}`}
                  prefetch={false}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-background sm:px-5"
                >
                  <span>
                    <span className="font-medium text-foreground">{family.name}</span>
                    <span className="text-muted-foreground"> · 가장 {family.leaderName}</span>
                  </span>
                  <span className="shrink-0 text-stone-600">{family.count}명</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
