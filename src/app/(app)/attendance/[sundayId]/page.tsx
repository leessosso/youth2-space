import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, CardHeader, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import {
  dateKeyToKstNoonIso,
  isWeeklyAttendanceOpen,
  kstDateKeyFromIso,
  weeklyAttendanceCloseDateKey,
} from "@/lib/kst-date";
import {
  listMarksBySunday,
  markMapByMemberId,
  resolveAttendanceSunday,
  summarizeMarks,
} from "@/lib/store/attendance";
import { isSpecialAttendance } from "@/lib/types";
import { getGroupByCurrentLeader, listGroups, listMembersByGroup } from "@/lib/store/groups";
import { importAttendanceQr } from "@/app/actions";

export default async function AttendanceSundayPage({
  params,
  searchParams,
}: {
  params: Promise<{ sundayId: string }>;
  searchParams: Promise<{ qrService?: string; qrMatched?: string; qrAmbiguous?: string; qrUnmatched?: string }>;
}) {
  const { sundayId } = await params;
  const sp = await searchParams;
  const session = await auth();
  const user = session!.user;

  const sunday = await resolveAttendanceSunday(sundayId);
  if (!sunday) notFound();
  if (sunday.id !== sundayId) redirect(`/attendance/${sunday.id}`);

  const special = isSpecialAttendance(sunday);
  const editable = special || isWeeklyAttendanceOpen(kstDateKeyFromIso(sunday.date));
  const closeLabel = formatDateKo(
    dateKeyToKstNoonIso(weeklyAttendanceCloseDateKey(kstDateKeyFromIso(sunday.date))),
  );

  if (!(await currentUserCanManageApp())) {
    const myGroup = await getGroupByCurrentLeader(user.id);
    if (!myGroup) {
      return (
        <Card padding="lg" tone="empty">
          현재 담당 가족이 없습니다. 목사에게 가장 배정을 요청해 주세요.
        </Card>
      );
    }
    redirect(`/attendance/${sundayId}/${myGroup.id}`);
  }

  const groups = await listGroups();
  const marks = markMapByMemberId(await listMarksBySunday(sundayId));
  const rows = await Promise.all(
    groups.map(async (g) => {
      const members = await listMembersByGroup(g.id);
      const totals = summarizeMarks(members.map((m) => m.id), marks);
      return { group: g, totals };
    }),
  );

  const ambiguous = sp.qrAmbiguous ? sp.qrAmbiguous.split(",").filter(Boolean) : [];
  const unmatched = sp.qrUnmatched ? sp.qrUnmatched.split(",").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/attendance" className="text-sm text-stone-600 underline">← 출석</Link>
        <h2 className="mt-2 text-xl font-semibold">{sunday.title}</h2>
        <p className="text-sm text-stone-600">{formatDateKo(sunday.date)}</p>
        {!special && (
          <p className="mt-1 text-sm text-muted-foreground">
            {editable ? `${closeLabel}까지 입력할 수 있습니다.` : "지난 주일 출석은 수정할 수 없습니다."}
          </p>
        )}
      </div>

      {sp.qrMatched !== undefined && (
        <Card padding="md" tone="success">
          <p>
            {sp.qrService === "s4" ? "4부" : "1-3부"} QR 매칭 {sp.qrMatched}명 반영했습니다.
          </p>
          {ambiguous.length > 0 && (
            <p className="mt-1">동명이인이라 반영하지 못함: {ambiguous.join(", ")} — 해당 가족 화면에서 QR을 직접 켜 주세요.</p>
          )}
          {unmatched.length > 0 && (
            <p className="mt-1">가족원 명단과 일치하지 않음: {unmatched.join(", ")}</p>
          )}
        </Card>
      )}

      {!special && editable && (
      <Card>
        <CardHeader title="QR 명단 가져오기" subtitle="CSV 또는 xlsx 파일의 첫 열에서 이름을 읽습니다" />
        <form
          action={async (fd) => {
            "use server";
            await importAttendanceQr(sundayId, fd.get("service") as "s13" | "s4", fd);
          }}
          className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-5"
        >
          <div>
            <Label>부</Label>
            <select name="service" className="rounded-lg border border-input px-2 py-1.5 text-sm" required>
              <option value="s4">4부</option>
              <option value="s13">1-3부</option>
            </select>
          </div>
          <div>
            <Label>파일</Label>
            <input type="file" name="file" accept=".csv,.xlsx,.xls" required className="text-sm" />
          </div>
          <Button type="submit">반영</Button>
        </form>
      </Card>
      )}

      <Card>
        <CardHeader
          title="가족별 합계"
          subtitle={special ? "가족을 눌러 참석을 체크합니다" : "가족을 눌러 명단을 수정합니다"}
        />
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${special ? "" : "min-w-[640px]"}`}>
            <thead>
              <tr className="border-b border-muted text-left text-muted-foreground">
                <th className="px-4 py-2 sm:px-5">가족</th>
                <th className="px-2 py-2">인원</th>
                {special ? (
                  <th className="px-2 py-2">참석</th>
                ) : (
                  <>
                    <th className="px-2 py-2">4부 출석</th>
                    <th className="px-2 py-2">4부 온라인</th>
                    <th className="px-2 py-2">4부 QR</th>
                    <th className="px-2 py-2">1-3부 출석</th>
                    <th className="px-2 py-2">1-3부 온라인</th>
                    <th className="px-2 py-2">1-3부 QR</th>
                    <th className="px-2 py-2">가족모임</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {rows.map(({ group, totals }) => (
                <tr key={group.id} className="relative hover:bg-background">
                  <td className="px-4 py-2 sm:px-5">
                    <Link
                      href={`/attendance/${sunday.id}/${group.id}`}
                      className="font-medium after:absolute after:inset-0"
                    >
                      {group.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{totals.memberCount}</td>
                  {special ? (
                    <td className="px-2 py-2">{totals.s13.present}</td>
                  ) : (
                    <>
                      <td className="px-2 py-2">{totals.s4.present}</td>
                      <td className="px-2 py-2">{totals.s4.broadcast}</td>
                      <td className="px-2 py-2">{totals.s4.qr}</td>
                      <td className="px-2 py-2">{totals.s13.present}</td>
                      <td className="px-2 py-2">{totals.s13.broadcast}</td>
                      <td className="px-2 py-2">{totals.s13.qr}</td>
                      <td className="px-2 py-2">{totals.familyMeeting}</td>
                    </>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={special ? 3 : 9} className="px-4 py-6 text-center text-muted-foreground">
                    표시할 가족이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
