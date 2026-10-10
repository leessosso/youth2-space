import Link from "next/link";
import { createLeaderMeeting } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateTimeKo } from "@/lib/format";
import { listMeetings } from "@/lib/store/meetings";
import type { LeaderMeeting } from "@/lib/types";

export default async function MeetingsPage() {
  const canAdmin = await currentUserCanManageApp();

  const meetings = await listMeetings();

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);
  const past = meetings.filter((m) => new Date(m.date) < now);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">리더모임</h2>
        <p className="text-sm text-stone-600">
          매주 기도회, 말씀 교안 나눔, 교안 해설, 그 주 광고 순으로 진행합니다. 나눔에는 가장, 임원, 게스트(부가장·사역팀장)가 함께합니다.
        </p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]"
            : "space-y-6"
        }
      >
        {canAdmin && (
          <Card className="lg:sticky lg:top-8" padding="md">
            <h3 className="font-medium">새 모임 등록</h3>
            <form
              action={async (fd) => {
                "use server";
                await createLeaderMeeting({
                  title: fd.get("title") as string,
                  date: fd.get("date") as string,
                  notes: (fd.get("notes") as string) || undefined,
                });
              }}
              className="mt-3 grid gap-3"
            >
              <div>
                <Label>제목</Label>
                <Input name="title" required placeholder="4월 1주 리더모임" />
              </div>
              <div>
                <Label>일시</Label>
                <Input name="date" type="datetime-local" required />
              </div>
              <div>
                <Label>그 주 광고</Label>
                <Textarea name="notes" placeholder="모임에서 전할 2청년회 광고" />
              </div>
              <Button type="submit">등록</Button>
            </form>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="예정된 모임" items={upcoming} />
          <Section title="지난 모임" items={past} />
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: LeaderMeeting[];
}) {
  return (
    <Card>
      <CardHeader title={title} />
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">없음</p>
      ) : (
        <ul className="divide-y divide-muted">
          {items.map((m) => (
            <li key={m.id}>
              <Link
                href={`/meetings/${m.id}`}
                className="block px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-muted-foreground">{formatDateTimeKo(m.date)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
