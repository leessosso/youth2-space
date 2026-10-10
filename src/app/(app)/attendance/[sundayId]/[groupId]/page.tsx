import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { saveAttendanceMarks } from "@/app/actions";
import { AttendanceChoice } from "@/components/attendance-choice";
import { Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp, leaderCanAccessGroup } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import {
  dateKeyToKstNoonIso,
  isWeeklyAttendanceOpen,
  kstDateKeyFromIso,
  weeklyAttendanceCloseDateKey,
} from "@/lib/kst-date";
import {
  listMarksBySundayAndGroup,
  markMapByMemberId,
  resolveAttendanceSunday,
  summarizeMarks,
} from "@/lib/store/attendance";
import { getGroupById, listMembersByGroup } from "@/lib/store/groups";
import { isSpecialAttendance } from "@/lib/types";

export default async function AttendanceGroupPage({
  params,
}: {
  params: Promise<{ sundayId: string; groupId: string }>;
}) {
  const { sundayId, groupId } = await params;
  const session = await auth();
  const user = session!.user;
  const canEditQr = await currentUserCanManageApp();

  if (!canEditQr) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) notFound();
  }

  const sunday = await resolveAttendanceSunday(sundayId);
  if (!sunday) notFound();
  if (sunday.id !== sundayId) redirect(`/attendance/${sunday.id}/${groupId}`);

  const [group, members, existingMarks] = await Promise.all([
    getGroupById(groupId),
    listMembersByGroup(groupId),
    listMarksBySundayAndGroup(sunday.id, groupId),
  ]);
  if (!group) notFound();

  const special = isSpecialAttendance(sunday);
  const editable = special || isWeeklyAttendanceOpen(kstDateKeyFromIso(sunday.date));
  const closeLabel = formatDateKo(
    dateKeyToKstNoonIso(weeklyAttendanceCloseDateKey(kstDateKeyFromIso(sunday.date))),
  );

  const marks = markMapByMemberId(existingMarks);
  const totals = summarizeMarks(members.map((m) => m.id), marks);

  return (
    <div className="space-y-6">
      <div>
        <Link href={canEditQr ? `/attendance/${sunday.id}` : "/attendance"} className="text-sm text-stone-600 underline">
          ← {canEditQr ? "가족별 합계" : "출석"}
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name} · {sunday.title}</h2>
        <p className="text-sm text-stone-600">{formatDateKo(sunday.date)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {special
            ? `참석 ${totals.s13.present}`
            : canEditQr
              ? `4부 출석 ${totals.s4.present} · 온라인 ${totals.s4.broadcast} · QR ${totals.s4.qr} · 1-3부 출석 ${totals.s13.present} · 온라인 ${totals.s13.broadcast} · QR ${totals.s13.qr} · 가족모임 ${totals.familyMeeting}`
              : `4부 출석 ${totals.s4.present} · 온라인 ${totals.s4.broadcast} · 1-3부 출석 ${totals.s13.present} · 온라인 ${totals.s13.broadcast} · 가족모임 ${totals.familyMeeting}`}
        </p>
      </div>

      <Card>
        <CardHeader
          title={special ? "참석 체크" : "가족원 출석"}
          subtitle={
            !editable
              ? "지난 주일 출석은 수정할 수 없습니다"
              : special
                ? undefined
                : `${closeLabel}까지 입력할 수 있습니다`
          }
        />
        <form
          action={async (fd) => {
            "use server";
            await saveAttendanceMarks(sunday.id, groupId, fd);
          }}
        >
          <fieldset disabled={!editable} className="min-w-0 border-0 p-0">
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${special ? "" : canEditQr ? "min-w-[640px]" : "min-w-[480px]"}`}>
              <thead>
                <tr className="border-b border-muted text-left text-muted-foreground">
                  <th className="px-4 py-2 sm:px-5">이름</th>
                  {special ? (
                    <th className="px-2 py-2">참석</th>
                  ) : (
                    <>
                      <th className="px-2 py-2">4부</th>
                      {canEditQr && <th className="px-2 py-2">4부 QR</th>}
                      <th className="px-2 py-2">1-3부</th>
                      {canEditQr && <th className="px-2 py-2">1-3부 QR</th>}
                      <th className="px-2 py-2">가족모임</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {members.map((m) => {
                  const mark = marks.get(m.id);
                  const s13Status = mark?.s13.status ?? "none";
                  const s4Status = mark?.s4.status ?? "none";
                  const attended = s13Status === "present";
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium sm:px-5">
                        {m.name}
                        <input type="hidden" name="memberId" value={m.id} />
                      </td>
                      {special ? (
                        <td className="px-2 py-2">
                          <div className="flex gap-3">
                            <label className="flex items-center gap-1 text-xs">
                              <input type="radio" name={`s13_${m.id}`} value="present" defaultChecked={attended} />
                              참석
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <input type="radio" name={`s13_${m.id}`} value="none" defaultChecked={!attended} />
                              결석
                            </label>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="px-2 py-2">
                            <AttendanceChoice name={`s4_${m.id}`} defaultStatus={s4Status} />
                          </td>
                          {canEditQr && (
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                name={`qr4_${m.id}`}
                                defaultChecked={mark?.s4.qr ?? false}
                              />
                            </td>
                          )}
                          <td className="px-2 py-2">
                            <AttendanceChoice name={`s13_${m.id}`} defaultStatus={s13Status} />
                          </td>
                          {canEditQr && (
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                name={`qr13_${m.id}`}
                                defaultChecked={mark?.s13.qr ?? false}
                              />
                            </td>
                          )}
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              name={`family_${m.id}`}
                              defaultChecked={mark?.familyMeeting ?? false}
                            />
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={special ? 2 : canEditQr ? 6 : 4} className="px-4 py-6 text-center text-muted-foreground">
                      가족원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          </fieldset>
          {editable && members.length > 0 && (
            <div className="border-t border-muted p-4 sm:p-5">
              <Button type="submit">저장</Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
