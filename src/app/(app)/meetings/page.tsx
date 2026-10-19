import Link from "next/link";
import { createLeaderMeeting } from "@/app/actions";
import { GuestAccessClosed } from "@/components/guest-access-closed";
import { Button, Card, CardHeader, Input, Label, Textarea } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTimeKo } from "@/lib/format";
import { kstDateKeyNow } from "@/lib/kst-date";
import { guestCanOpenMeeting, isScopedMeetingGuest } from "@/lib/meeting-guest";
import { listMeetings } from "@/lib/store/meetings";
import { canManageApp, type LeaderMeeting } from "@/lib/types";

export default async function MeetingsPage() {
  const currentUser = await getCurrentUser();
  const canAdmin = currentUser ? canManageApp(currentUser) : false;
  const scopedGuest = currentUser ? isScopedMeetingGuest(currentUser) : false;

  const meetings = await listMeetings();
  const visibleMeetings = scopedGuest && currentUser
    ? meetings.filter((meeting) => guestCanOpenMeeting(meeting, currentUser.id, kstDateKeyNow()))
    : meetings;

  const now = new Date();
  const upcoming = visibleMeetings.filter((m) => new Date(m.date) >= now);
  const past = visibleMeetings.filter((m) => new Date(m.date) < now);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">리더모임</h2>
        <p className="text-sm text-stone-600">
          매주 기도회, 말씀 교안 나눔, 교안 해설, 그 주 광고 순으로 진행합니다. 가장이 못 오는 날은 그 주 모임에서 부가장을 넣습니다. 처음이면 계정을 만들고, 다음부터는 있는 계정을 그 모임에만 넣습니다. 모임 날까지 교안·배정모자·공지를 보고, 그 날이 지나면 접근이 닫힙니다. 계정은 남습니다.
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

        {scopedGuest && visibleMeetings.length === 0 ? (
          <GuestAccessClosed />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title={scopedGuest ? "이번 모임" : "예정된 모임"} items={scopedGuest ? visibleMeetings : upcoming} />
            {!scopedGuest && <Section title="지난 모임" items={past} />}
          </div>
        )}
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
