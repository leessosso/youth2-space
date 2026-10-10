import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { FamilyReportThread } from "@/components/family-report-thread";
import { Card } from "@/components/ui";
import { isPastorOrAdmin, leaderCanAccessGroup } from "@/lib/auth";
import { getGroupById, listMembersByGroup } from "@/lib/store/groups";
import { getThreadByGroup, listMessagesByThread } from "@/lib/store/reports";
import { getUsersByIds } from "@/lib/store/users";

export default async function FamilyReportPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const session = await auth();
  const user = session!.user;

  const group = await getGroupById(groupId);
  if (!group) notFound();

  if (user.role === "LEADER") {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) notFound();
  } else if (!isPastorOrAdmin(user.role)) {
    notFound();
  }

  const [members, thread, leader] = await Promise.all([
    listMembersByGroup(groupId),
    getThreadByGroup(groupId),
    group.currentLeaderId ? getUsersByIds([group.currentLeaderId]) : Promise.resolve(new Map()),
  ]);

  const rawMessages = thread ? await listMessagesByThread(thread.id) : [];
  const authors = await getUsersByIds(rawMessages.map((m) => m.authorId));
  const messages = rawMessages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    aboutMemberId: m.aboutMemberId,
    author: {
      name: authors.get(m.authorId)?.name ?? "알 수 없음",
      role: authors.get(m.authorId)?.role ?? "LEADER",
    },
  }));

  const leaderName = group.currentLeaderId ? leader.get(group.currentLeaderId)?.name : undefined;

  return (
    <div className="-mx-4 space-y-3 sm:mx-0">
      {isPastorOrAdmin(user.role) && (
        <Link href="/reports" className="px-4 text-sm text-stone-600 underline sm:px-0">← 돌봄카드 목록</Link>
      )}
      <Card className="overflow-hidden sm:max-w-3xl" bleed>
        <div className="flex items-center justify-between gap-3 border-b border-muted px-3 py-2">
          <h2 className="text-base font-semibold text-foreground">{group.name}</h2>
          <p className="truncate text-xs text-muted-foreground">가장 {leaderName ?? "미배정"}</p>
        </div>
        <FamilyReportThread
          groupId={group.id}
          members={members.map((m) => ({ id: m.id, name: m.name }))}
          messages={messages}
        />
      </Card>
    </div>
  );
}
