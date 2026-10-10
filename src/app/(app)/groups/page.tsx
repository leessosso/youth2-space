import Link from "next/link";
import { createGroupFromMember } from "@/app/actions";
import { AppointMemberForm } from "@/components/member-account-form";
import { Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { termLabel } from "@/lib/format";
import { listAllMembers, listGroups } from "@/lib/store/groups";
import { listActiveOfficers } from "@/lib/store/officers";
import { getCurrentTerm } from "@/lib/store/settings";
import { getUsersByIds, listUsersByRole } from "@/lib/store/users";

export default async function GroupsPage() {
  const canAdmin = await currentUserCanManageApp();

  const term = await getCurrentTerm();
  const [groups, members, leaderUsers, officers] = await Promise.all([
    listGroups(),
    listAllMembers(),
    canAdmin ? listUsersByRole("LEADER") : Promise.resolve([]),
    canAdmin ? listActiveOfficers(term.year) : Promise.resolve([]),
  ]);
  const currentGroupIds = new Set(groups.map((group) => group.id));
  const unassigned = canAdmin ? members.filter((member) => !currentGroupIds.has(member.groupId)) : [];
  const leaders = await getUsersByIds(groups.map((g) => g.currentLeaderId ?? "").filter(Boolean));
  const memberChoices = members.map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
    userId: member.userId,
  }));
  const linkedUserIds = new Set(memberChoices.flatMap((member) => (member.userId ? [member.userId] : [])));
  const unlinkedLeaders = leaderUsers
    .filter((leader) => !linkedUserIds.has(leader.id))
    .map((leader) => ({ id: leader.id, name: leader.name, email: leader.email, phone: leader.phone }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">가족</h2>
        <p className="text-sm text-stone-600">
          {termLabel(term)} 구성입니다. 가족과 가장은 이 학기에 다시 정하고, 가장은 성도 명단에서 고릅니다.
        </p>
      </div>

      {canAdmin && officers.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-stone-700">
            올해 임원이 아직 없습니다.{" "}
            <Link href="/admin/handover" className="font-medium text-foreground underline">
              가장·임원 관리
            </Link>
            에서 목사가 임원을 앉힌 뒤 가족을 구성합니다.
          </p>
        </Card>
      )}

      {canAdmin && (
        <Card padding="md">
          <h3 className="font-medium text-foreground">이 학기 가족 추가</h3>
          <p className="mt-1 text-sm text-stone-600">
            가장은 성도 명단에서 고릅니다. 계정이 없으면 여기서 만들거나 기존 계정과 연결하고, 그 성도를 이 가족 가족원으로 넣습니다.
          </p>
          <div className="mt-3">
            <AppointMemberForm
              members={memberChoices}
              unlinkedLeaders={unlinkedLeaders}
              action={createGroupFromMember}
              submitLabel="추가"
              memberLabel="가장"
            >
              <div>
                <Label>가족 이름</Label>
                <Input name="name" required placeholder="4가족" />
              </div>
            </AppointMemberForm>
          </div>
        </Card>
      )}

      {canAdmin && unassigned.length > 0 && (
        <Card>
          <CardHeader
            title="이번 학기 미배정 가족원"
            subtitle="아직 이번 학기 가족에 없습니다. 가족 화면에서 옮겨 주세요."
          />
          <ul className="divide-y divide-muted text-sm">
            {unassigned.map((m) => (
              <li key={m.id} className="px-4 py-2 sm:px-5">{m.name}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            prefetch={false}
            className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <Card className="h-full" interactive>
              <CardHeader title={g.name} />
              <div className="space-y-2 px-4 py-3 text-sm sm:px-5">
                <p>
                  <span className="text-muted-foreground">가장:</span>{" "}
                  {(g.currentLeaderId && leaders.get(g.currentLeaderId)?.name) ?? "미배정"}
                </p>
                <p>
                  <span className="text-muted-foreground">가족원:</span>{" "}
                  {members.filter((m) => m.groupId === g.id).length}명
                </p>
              </div>
            </Card>
          </Link>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">이번 학기에 구성된 가족이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
