import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { closeEventSurvey, reopenEventSurvey } from "@/app/actions";
import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { getGroupByCurrentLeader, listGroups, listMembersByGroup } from "@/lib/store/groups";
import {
  getEventSurveyById,
  listResponsesBySurvey,
  responseMapByMemberId,
  summarizeResponses,
} from "@/lib/store/surveys";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;

  const survey = await getEventSurveyById(id);
  if (!survey) notFound();

  if (!(await currentUserCanManageApp())) {
    const myGroup = await getGroupByCurrentLeader(user.id);
    if (!myGroup) {
      return (
        <Card padding="lg" tone="empty">
          현재 담당 가족이 없습니다. 목사에게 가장 배정을 요청해 주세요.
        </Card>
      );
    }
    redirect(`/surveys/${id}/${myGroup.id}`);
  }

  const groups = await listGroups();
  const responses = responseMapByMemberId(await listResponsesBySurvey(id));
  const rows = await Promise.all(
    groups.map(async (g) => {
      const members = await listMembersByGroup(g.id);
      const totals = summarizeResponses(members.map((m) => m.id), responses, survey.questions);
      return { group: g, totals };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/surveys" className="text-sm text-stone-600 underline">← 조사 목록</Link>
          <h2 className="mt-2 text-xl font-semibold">{survey.title}</h2>
          <p className="text-sm text-stone-600">{formatDateKo(survey.eventDate)}</p>
          {survey.description && <p className="mt-1 text-sm text-muted-foreground">{survey.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={survey.status === "open" ? "green" : "neutral"}>
            {survey.status === "open" ? "진행 중" : "마감"}
          </Badge>
          <form
            action={async () => {
              "use server";
              if (survey.status === "open") {
                await closeEventSurvey(id);
              } else {
                await reopenEventSurvey(id);
              }
            }}
          >
            <Button type="submit" variant="secondary">
              {survey.status === "open" ? "마감하기" : "다시 열기"}
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader title="가족별 응답 현황" subtitle="가족을 눌러 대신 입력·수정할 수 있습니다" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-muted text-left text-muted-foreground">
                <th className="px-4 py-2 sm:px-5">가족</th>
                <th className="px-2 py-2">응답</th>
                {survey.questions.map((q) => (
                  <th key={q.id} className="px-2 py-2">{q.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted">
              {rows.map(({ group, totals }) => (
                <tr key={group.id} className="relative hover:bg-background">
                  <td className="px-4 py-2 sm:px-5">
                    <Link
                      href={`/surveys/${id}/${group.id}`}
                      className="font-medium after:absolute after:inset-0"
                    >
                      {group.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{totals.respondedCount}/{totals.memberCount}</td>
                  {survey.questions.map((q) => {
                    const qt = totals.perQuestion[q.id];
                    return (
                      <td key={q.id} className="px-2 py-2">
                        {q.type === "yesno" && (qt.yesCount ?? 0)}
                        {q.type === "number" && (qt.numberSum ?? 0)}
                        {q.type === "text" && "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={2 + survey.questions.length} className="px-4 py-6 text-center text-muted-foreground">
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
