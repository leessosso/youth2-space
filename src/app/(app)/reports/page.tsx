import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPastorOrAdmin } from "@/lib/auth";
import { Badge, Card } from "@/components/ui";
import { getGroupByCurrentLeader, listGroups, listMembersByGroup } from "@/lib/store/groups";
import { getThreadSummaryByGroup } from "@/lib/store/reports";
import { getUsersByIds } from "@/lib/store/users";
import type { PastoralMessage, PastoralThread } from "@/lib/types";

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function isUnread(thread: PastoralThread, latest: PastoralMessage, authorRole: string, viewerId: string): boolean {
  if (authorRole !== "LEADER") return false;
  const readAt = thread.readAtByUser?.[viewerId];
  if (!readAt) return true;
  return new Date(latest.createdAt).getTime() > new Date(readAt).getTime();
}

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

  const [leaders, rows] = await Promise.all([
    getUsersByIds(groups.map((g) => g!.currentLeaderId ?? "").filter(Boolean)),
    Promise.all(
      groups.map(async (g) => {
        const [members, summary] = await Promise.all([
          listMembersByGroup(g!.id),
          getThreadSummaryByGroup(g!.id),
        ]);
        return { group: g!, memberCount: members.length, ...summary };
      }),
    ),
  ]);

  const authors = await getUsersByIds(rows.map((r) => r.latest?.authorId ?? "").filter(Boolean));

  const annotated = rows.map((row) => {
    const authorRole = row.latest ? authors.get(row.latest.authorId)?.role ?? "LEADER" : null;
    const unread =
      row.thread && row.latest && authorRole ? isUnread(row.thread, row.latest, authorRole, user.id) : false;
    return { ...row, authorRole, unread };
  });

  annotated.sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    const aTime = a.latest ? new Date(a.latest.createdAt).getTime() : 0;
    const bTime = b.latest ? new Date(b.latest.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">돌봄카드</h2>
        <p className="text-sm text-stone-600">
          이번 학기 가족 단위 비공개 방 — 해당 가장과 목사만 열람할 수 있습니다.
        </p>
      </div>

      {annotated.length === 0 ? (
        <Card>
          <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">표시할 가족이 없습니다.</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {annotated.map(({ group, memberCount, latest, unread }) => {
            const leaderName = (group.currentLeaderId && leaders.get(group.currentLeaderId)?.name) ?? "미배정";
            const authorName = latest ? authors.get(latest.authorId)?.name ?? leaderName : undefined;
            return (
              <li key={group.id}>
                <Link href={`/reports/${group.id}`} className="block h-full">
                  <Card className="h-full" interactive tone={unread ? "attention" : "default"}>
                    <div className="px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground">
                          {group.name}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            (가장 {leaderName} · 가족원 {memberCount}명)
                          </span>
                        </p>
                        {unread && <Badge tone="accent">새 메시지</Badge>}
                      </div>
                      {latest ? (
                        <>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {authorName} · {formatRelativeTime(latest.createdAt)}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-sm text-stone-600">{latest.body}</p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-stone-400">아직 메시지 없음</p>
                      )}
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
