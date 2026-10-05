import Link from "next/link";
import { notFound } from "next/navigation";
import { assignMemberToGroup } from "@/app/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo, termLabel } from "@/lib/format";
import {
  getGroupById,
  listAllMembers,
  listLeaderTermsByGroup,
  listMembersByGroup,
} from "@/lib/store/groups";
import { getUsersByIds } from "@/lib/store/users";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canAdmin = await currentUserCanManageApp();

  const group = await getGroupById(id);
  if (!group) notFound();

  const [members, leaderTerms, allMembers] = await Promise.all([
    listMembersByGroup(id),
    listLeaderTermsByGroup(id),
    canAdmin ? listAllMembers() : Promise.resolve([]),
  ]);

  const leaders = await getUsersByIds([
    group.currentLeaderId ?? "",
    ...leaderTerms.map((t) => t.leaderId),
  ]);
  const currentLeaderName = group.currentLeaderId ? leaders.get(group.currentLeaderId)?.name : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-stone-600 underline">← 가족 목록</Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name}</h2>
        <p className="text-sm text-stone-600">
          {termLabel({ year: group.year, half: group.half })} · 가장: {currentLeaderName ?? "미배정"}
        </p>
        {canAdmin && group.currentLeaderId && !members.some((member) => member.userId === group.currentLeaderId) && (
          <p className="mt-2 text-sm text-stone-600">
            이 가장은 성도 명단과 연결되어 있지 않습니다.{" "}
            <Link href="/admin/members" className="font-medium text-stone-900 underline">
              성도 명단
            </Link>
            에서 연결해 주세요.
          </p>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="가족원" />
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="px-4 py-3 font-medium sm:px-5">
              {m.name}
              {m.userId && m.userId === group.currentLeaderId && (
                <span className="ml-2 text-xs font-normal text-stone-500">가장</span>
              )}
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">가족원이 없습니다.</li>
          )}
        </ul>
        {canAdmin && (
          <p className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600 sm:px-5">
            가족원 추가는{" "}
            <Link href="/admin/members" className="font-medium text-stone-900 underline">
              성도 명단
            </Link>
            에서 합니다.
          </p>
        )}
      </Card>

      {canAdmin && (
        <Card>
          <CardHeader title="가족원 소속 변경" subtitle="다른 가족에서 이 가족으로 이동" />
          <ul className="divide-y divide-stone-100">
            {allMembers
              .filter((m) => m.groupId !== id)
              .map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm sm:px-5">
                  <span>{m.name}</span>
                  <form
                    action={async () => {
                      "use server";
                      await assignMemberToGroup(m.id, id);
                    }}
                  >
                    <Button type="submit" variant="secondary">이 가족으로 배정</Button>
                  </form>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Link
        href={`/reports/${id}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      >
        <Card className="h-full transition hover:border-stone-300 hover:bg-stone-50">
          <CardHeader title="돌봄카드" subtitle="목사와 가장이 나누는 방" />
        </Card>
      </Link>

      <Card>
        <CardHeader title="가장 이력" subtitle="상반기·하반기 가장 구성" />
        <ul className="divide-y divide-stone-100 text-sm">
          {leaderTerms.map((t) => (
            <li key={t.id} className="px-4 py-3 sm:px-5">
              <span className="font-medium">{leaders.get(t.leaderId)?.name ?? "알 수 없음"}</span>
              <span className="text-stone-500">
                {" "}
                · {termLabel({ year: t.year, half: t.half })} · {formatDateKo(t.startedAt)}
                {t.endedAt ? ` ~ ${formatDateKo(t.endedAt)}` : " ~ 현재"}
              </span>
            </li>
          ))}
          {leaderTerms.length === 0 && (
            <li className="px-4 py-6 text-sm text-stone-500 sm:px-5">이력이 없습니다.</li>
          )}
        </ul>
      </Card>
      </div>
    </div>
  );
}
