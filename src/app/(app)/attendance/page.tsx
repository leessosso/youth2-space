import Link from "next/link";
import { createSpecialAttendance } from "@/app/actions";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Badge, Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import {
  dateKeyToKstNoonIso,
  kstDateKeyFromIso,
  mostRecentSundayKey,
  weeklyAttendanceCloseDateKey,
} from "@/lib/kst-date";
import {
  listMarksBySunday,
  listSpecialSundays,
  listWeeklySundaySlots,
  summarizeAllMarks,
} from "@/lib/store/attendance";

export default async function AttendanceListPage() {
  const canAdmin = await currentUserCanManageApp();
  const currentKey = mostRecentSundayKey();

  const [weeks, specials] = await Promise.all([
    listWeeklySundaySlots(),
    listSpecialSundays(),
  ]);

  const totalsById = new Map(
    await Promise.all(
      weeks
        .filter((week) => week.persisted)
        .map(async (week) => {
          const totals = summarizeAllMarks(await listMarksBySunday(week.sunday.id));
          return [week.sunday.id, totals] as const;
        }),
    ),
  );

  const current = weeks.find((week) => kstDateKeyFromIso(week.sunday.date) === currentKey) ?? weeks[0];
  const past = weeks.filter((week) => week !== current);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">출석</h2>
        <p className="text-sm text-stone-600">
          이번 주일 출석은 그 주 토요일까지 입력합니다. 다음 일요일부터는 전 주 출석을 고칠 수 없습니다.
        </p>
      </div>

      {current && (
        <Card>
          <Link
            href={`/attendance/${current.sunday.id}`}
            className="block px-4 py-4 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{current.sunday.title}</p>
              <Badge tone="green">이번 주일</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formatDateKo(current.sunday.date)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateKo(dateKeyToKstNoonIso(weeklyAttendanceCloseDateKey(currentKey)))}까지 입력
            </p>
            <WeekTotals totals={totalsById.get(current.sunday.id)} showQr={canAdmin} />
          </Link>
        </Card>
      )}

      <CollapsibleSection title="지난 주일" subtitle="지난 주일은 볼 수만 있습니다">
        <ul className="divide-y divide-muted">
          {past.map((week) => (
            <li key={week.sunday.id}>
              <Link
                href={`/attendance/${week.sunday.id}`}
                className="block px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
              >
                <p className="font-medium">{week.sunday.title}</p>
                <p className="text-sm text-muted-foreground">{formatDateKo(week.sunday.date)}</p>
                <WeekTotals totals={totalsById.get(week.sunday.id)} showQr={canAdmin} />
              </Link>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {(canAdmin || specials.length > 0) && (
        <div
          className={
            canAdmin
              ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]"
              : undefined
          }
        >
          {canAdmin && (
            <Card padding="md">
              <h3 className="font-medium">비정기 출석체크</h3>
              <p className="mt-1 text-sm text-stone-600">
                수련회나 특별 모임처럼, 매주가 아닌 날에만 엽니다.
              </p>
              <form
                action={async (fd) => {
                  "use server";
                  await createSpecialAttendance(
                    fd.get("date") as string,
                    fd.get("title") as string,
                  );
                }}
                className="mt-3 grid gap-3"
              >
                <div>
                  <Label>날짜</Label>
                  <Input name="date" type="date" required />
                </div>
                <div>
                  <Label>제목</Label>
                  <Input name="title" placeholder="수련회 출석" required />
                </div>
                <Button type="submit">열기</Button>
              </form>
            </Card>
          )}

          <Card>
            <CardHeader title="비정기 출석" subtitle="참석 여부만 체크합니다" />
            <ul className="divide-y divide-muted">
              {specials.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/attendance/${s.id}`}
                    className="block px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
                  >
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-muted-foreground">{formatDateKo(s.date)}</p>
                  </Link>
                </li>
              ))}
              {specials.length === 0 && (
                <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
                  열린 비정기 출석이 없습니다.
                </li>
              )}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function WeekTotals({
  totals,
  showQr,
}: {
  totals?: {
    s13: { present: number; broadcast: number; qr: number };
    s4: { present: number; broadcast: number; qr: number };
    familyMeeting: number;
  };
  showQr: boolean;
}) {
  if (!totals) {
    return <p className="mt-1 text-xs text-muted-foreground">아직 입력 전</p>;
  }
  const qr4 = showQr ? ` · QR ${totals.s4.qr}` : "";
  const qr13 = showQr ? ` · QR ${totals.s13.qr}` : "";
  return (
    <p className="mt-1 text-xs text-muted-foreground">
      4부 출석 {totals.s4.present} · 온라인 {totals.s4.broadcast}{qr4}
      {" · "}1-3부 출석 {totals.s13.present} · 온라인 {totals.s13.broadcast}{qr13}
      {" · "}가족모임 {totals.familyMeeting}
    </p>
  );
}
