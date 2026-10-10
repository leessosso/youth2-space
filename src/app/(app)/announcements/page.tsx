import Link from "next/link";
import { auth } from "@/auth";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { formatDateTimeKo } from "@/lib/format";
import { getUserById } from "@/lib/store/users";
import { audienceLabel, listAnnouncements, listSentAnnouncements } from "@/lib/store/announcements";
import { canManageAnnouncements } from "@/lib/types";

export default async function AnnouncementsPage() {
  const session = await auth();
  const fullUser = await getUserById(session!.user.id);
  const canManage = fullUser ? canManageAnnouncements(fullUser) : false;

  const sent = await listSentAnnouncements();
  const drafts = canManage
    ? (await listAnnouncements()).filter((a) => a.status === "draft")
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">공지</h2>
          <p className="text-sm text-stone-600">목사·임원이 보낸 공지와 임시저장 목록</p>
        </div>
        {canManage && (
          <Link href="/announcements/new">
            <Button type="button">새 공지 작성</Button>
          </Link>
        )}
      </div>

      {canManage && drafts.length > 0 && (
        <Card>
          <CardHeader title="임시저장" />
          <ul className="divide-y divide-muted">
            {drafts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/announcements/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
                >
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {audienceLabel(a.audience)} · {formatDateTimeKo(a.createdAt)}
                    </p>
                  </div>
                  <Badge tone="neutral">임시저장</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="발송 내역" />
        <ul className="divide-y divide-muted">
          {sent.map((a) => (
            <li key={a.id}>
              <Link
                href={`/announcements/${a.id}`}
                className="block px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-muted-foreground">
                  {audienceLabel(a.audience)}
                  {a.sentAt ? ` · ${formatDateTimeKo(a.sentAt)}` : ""}
                </p>
              </Link>
            </li>
          ))}
          {sent.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">발송된 공지가 없습니다.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
