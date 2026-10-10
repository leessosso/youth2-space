import Link from "next/link";
import { createEventSurvey } from "@/app/actions";
import { SurveyCreateForm } from "@/components/survey-create-form";
import { Badge, Card, CardHeader } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { formatDateKo } from "@/lib/format";
import { listEventSurveys } from "@/lib/store/surveys";
import { isParticipationSurvey } from "@/lib/types";

export default async function SurveysPage() {
  const canAdmin = await currentUserCanManageApp();

  const surveys = await listEventSurveys();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">참여조사</h2>
        <p className="text-sm text-stone-600">
          필요할 때만 여는 조사입니다. 가족 참여만 받거나, 질문을 직접 만들어 받을 수 있습니다. 매주 주일 출석과는 별개입니다.
        </p>
      </div>

      <div
        className={
          canAdmin
            ? "grid items-start gap-6 lg:grid-cols-[minmax(22rem,26rem)_1fr]"
            : undefined
        }
      >
        {canAdmin && (
          <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-medium">조사 만들기</h3>
            <p className="mt-1 text-sm text-stone-600">
              예배, 식사, 행사처럼 필요한 조사를 열어 가장이 가족원 대신 응답하게 합니다.
            </p>
            <div className="mt-3">
              <SurveyCreateForm action={createEventSurvey} />
            </div>
          </Card>
          </div>
        )}

        <Card>
          <CardHeader title="조사 목록" />
          <ul className="divide-y divide-muted">
            {surveys.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/surveys/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-background focus-visible:bg-background focus-visible:outline-none sm:px-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{s.title}</p>
                      <Badge tone={isParticipationSurvey(s.kind) ? "blue" : "neutral"}>
                        {isParticipationSurvey(s.kind) ? "참여" : "질문"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDateKo(s.eventDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={s.status === "open" ? "green" : "neutral"}>
                      {s.status === "open" ? "진행 중" : "마감"}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
            {surveys.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground sm:px-5">등록된 조사가 없습니다.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
