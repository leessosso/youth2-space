import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPastorOrAdmin } from "@/lib/auth";
import { Card } from "@/components/ui";
import { getGroupByCurrentLeader, listGroups, listMembersByGroup } from "@/lib/store/groups";
import { getLatestMessageByGroup } from "@/lib/store/reports";
import { getUsersByIds } from "@/lib/store/users";

export default async function ReportsPage() {
  const session = await auth();
  const user = session!.user;

  if (!isPastorOrAdmin(user.role)) {
    const mine = await getGroupByCurrentLeader(user.id);
    if (mine) redirect(`/reports/${mine.id}`);
  }

  const groups = isPastorOrAdmin(user.role)
    ? await listGroups()
    : [await getGroupByCurrentLeader(user.id)].filter((g) => g !== null);

  const leaders = await getUsersByIds(groups.map((g) => g!.currentLeaderId ?? "").filter(Boolean));

  const rows = await Promise.all(
    groups.map(async (g) => {
      const [members, latest] = await Promise.all([
        listMembersByGroup(g!.id),
        getLatestMessageByGroup(g!.id),
      ]);
      return { group: g!, memberCount: members.length, latest };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">돌봄카드</h2>
        <p className="text-sm text-stone-600">
          이번 학기 가족 단위 비공개 방 — 해당 가장과 목사만 열람할 수 있습니다.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">표시할 가족이 없습니다.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ group, memberCount, latest }) => (
            <li key={group.id}>
              <Link href={`/reports/${group.id}`} className="block h-full">
                <Card className="h-full" interactive>
                  <div className="px-4 py-4 sm:px-5">
                    <p className="font-medium text-foreground">
                      {group.name}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        (가장 {(group.currentLeaderId && leaders.get(group.currentLeaderId)?.name) ?? "미배정"} · 가족원 {memberCount}명)
                      </span>
                    </p>
                    {latest ? (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">최근 메시지 있음</p>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">아직 메시지 없음</p>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
