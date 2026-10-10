import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { saveSurveyResponses } from "@/app/actions";
import { Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp, leaderCanAccessGroup } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { getGroupById, listMembersByGroup } from "@/lib/store/groups";
import {
  getEventSurveyById,
  listResponsesBySurveyAndGroup,
  responseMapByMemberId,
} from "@/lib/store/surveys";

export default async function SurveyGroupPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id, groupId } = await params;
  const session = await auth();
  const user = session!.user;
  const canAdmin = await currentUserCanManageApp();

  if (!canAdmin) {
    const ok = await leaderCanAccessGroup(user.id, groupId);
    if (!ok) notFound();
  }

  const [survey, group, members, existingResponses] = await Promise.all([
    getEventSurveyById(id),
    getGroupById(groupId),
    listMembersByGroup(groupId),
    listResponsesBySurveyAndGroup(id, groupId),
  ]);
  if (!survey || !group) notFound();

  const responses = responseMapByMemberId(existingResponses);
  const readOnly = survey.status === "closed" && !canAdmin;

  return (
    <div className="space-y-6">
      <div>
        <Link href={canAdmin ? `/surveys/${id}` : "/surveys"} className="text-sm text-stone-600 underline">
          ← {canAdmin ? "가족별 응답 현황" : "조사 목록"}
        </Link>
        <h2 className="mt-2 text-xl font-semibold">{group.name} · {survey.title}</h2>
        <p className="text-sm text-stone-600">{formatDateKo(survey.eventDate)}</p>
      </div>

      {readOnly && (
        <Card padding="md" tone="muted">
          이 조사는 마감되었습니다. 목사에게 문의해 주세요.
        </Card>
      )}

      <Card>
        <CardHeader title="가족원 응답" />
        <form
          action={async (fd) => {
            "use server";
            await saveSurveyResponses(id, groupId, fd);
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-muted text-left text-muted-foreground">
                  <th className="px-4 py-2 sm:px-5">이름</th>
                  {survey.questions.map((q) => (
                    <th key={q.id} className="px-2 py-2">{q.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted">
                {members.map((m) => {
                  const response = responses.get(m.id);
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium sm:px-5">
                        {m.name}
                        <input type="hidden" name="memberId" value={m.id} />
                      </td>
                      {survey.questions.map((q) => {
                        const answer = response?.answers[q.id];
                        if (q.type === "yesno") {
                          return (
                            <td key={q.id} className="px-2 py-2">
                              <input
                                type="checkbox"
                                name={`${q.id}_${m.id}`}
                                defaultChecked={answer === true}
                                disabled={readOnly}
                              />
                            </td>
                          );
                        }
                        if (q.type === "number") {
                          return (
                            <td key={q.id} className="px-2 py-2">
                              <input
                                type="number"
                                name={`${q.id}_${m.id}`}
                                defaultValue={typeof answer === "number" ? answer : ""}
                                disabled={readOnly}
                                className="w-20 rounded-lg border border-input px-2 py-1 text-sm"
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={q.id} className="px-2 py-2">
                            <input
                              type="text"
                              name={`${q.id}_${m.id}`}
                              defaultValue={typeof answer === "string" ? answer : ""}
                              disabled={readOnly}
                              className="w-32 rounded-lg border border-input px-2 py-1 text-sm"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={1 + survey.questions.length} className="px-4 py-6 text-center text-muted-foreground">
                      가족원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {members.length > 0 && !readOnly && (
            <div className="border-t border-muted p-4 sm:p-5">
              <Button type="submit">저장</Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
