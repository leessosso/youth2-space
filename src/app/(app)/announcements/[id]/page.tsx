import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteAnnouncement, updateAnnouncement } from "@/app/actions";
import { AnnouncementForm } from "@/components/announcement-form";
import { Badge, Button, Card, Notice } from "@/components/ui";
import { formatDateTimeKo, roleLabel } from "@/lib/format";
import { audienceLabel, getAnnouncementById } from "@/lib/store/announcements";
import { getUserById, getUsersByIds, listLoginUsersForServing } from "@/lib/store/users";
import { canManageAnnouncements } from "@/lib/types";

export default async function AnnouncementDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; sendError?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const fullUser = await getUserById(session!.user.id);
  const canManage = fullUser ? canManageAnnouncements(fullUser) : false;

  const announcement = await getAnnouncementById(id);
  if (!announcement) notFound();

  if (announcement.status === "draft" && !canManage) {
    redirect("/announcements");
  }

  const authors = await getUsersByIds(
    [announcement.createdById, announcement.sentById ?? ""].filter(Boolean),
  );

  if (announcement.status === "draft" && canManage) {
    const users = await listLoginUsersForServing();
    return (
      <div className="space-y-6">
        <div>
          <Link href="/announcements" className="text-sm text-stone-600 underline">← 공지 목록</Link>
          <h2 className="mt-2 text-xl font-semibold">공지 편집 (임시저장)</h2>
        </div>
        {query.sendError && (
          <Notice>
            {query.sendError}
          </Notice>
        )}
        <Card className="max-w-2xl" padding="md">
          <AnnouncementForm
            users={users}
            initial={announcement}
            action={async (formData) => {
              "use server";
              await updateAnnouncement(id, formData);
            }}
          />
        </Card>
        <form
          action={async () => {
            "use server";
            await deleteAnnouncement(id);
          }}
        >
          <Button type="submit" variant="secondary">임시저장 삭제</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/announcements" className="text-sm text-stone-600 underline">← 공지 목록</Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">{announcement.title}</h2>
          <Badge tone="green">발송됨</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {audienceLabel(announcement.audience)}
          {announcement.sentAt && ` · ${formatDateTimeKo(announcement.sentAt)}`}
        </p>
      </div>

      {query.sent === "1" && (
        <Notice tone="success">
          공지를 발송했습니다. 푸시 성공 {announcement.pushSuccessCount ?? 0}건, 실패{" "}
          {announcement.pushFailureCount ?? 0}건
          {(announcement.pushSuccessCount ?? 0) === 0 && (announcement.pushFailureCount ?? 0) === 0
            ? " (구독 중인 대상이 없을 수 있습니다)"
            : ""}
          .
        </Notice>
      )}

      <Card padding="md">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{announcement.body}</div>
        <dl className="mt-6 grid gap-2 border-t border-muted pt-4 text-sm text-stone-600">
          <div>
            <dt className="inline font-medium text-stone-700">작성: </dt>
            <dd className="inline">
              {authors.get(announcement.createdById)?.name ?? "—"}
              {authors.get(announcement.createdById)?.role
                ? ` (${roleLabel(authors.get(announcement.createdById)!.role)})`
                : ""}
            </dd>
          </div>
          {announcement.sentById && (
            <div>
              <dt className="inline font-medium text-stone-700">발송: </dt>
              <dd className="inline">{authors.get(announcement.sentById)?.name ?? "—"}</dd>
            </div>
          )}
          {typeof announcement.pushSuccessCount === "number" && (
            <div>
              <dt className="inline font-medium text-stone-700">푸시: </dt>
              <dd className="inline">
                성공 {announcement.pushSuccessCount} · 실패 {announcement.pushFailureCount ?? 0}
              </dd>
            </div>
          )}
        </dl>
      </Card>
    </div>
  );
}
