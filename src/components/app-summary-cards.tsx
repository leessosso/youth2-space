import { Badge, Card, CardHeader } from "@/components/ui";
import type { HomeCard } from "@/lib/platform/home-cards";
import {
  tongdokLine,
  trainingLine,
  type TongdokCohortSummary,
  type TrainingProgramSummary,
} from "@/lib/platform/summary/schema";
import { TONGDOK_SSO_ENTRY_PATH } from "@/lib/platform/tongdok-sso-constants";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";

const linkClass =
  "block rounded-2xl transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * 훈련·통독 참여 요약 카드 (서버 컴포넌트). 데이터는 대시보드가 다른 데이터와 병렬로 가져와 넘긴다.
 * SSO 진입은 전체 페이지 이동이어야 해서 next/link 대신 <a>를 쓴다.
 */

/** 훈련 요약 카드. 카드 자체가 SSO 진입이라 `훈련 프로그램` 바로가기를 대신한다. */
export function TrainingSummaryCard({ programs }: { programs: TrainingProgramSummary[] }) {
  return (
        <a href={TRAINING_SSO_ENTRY_PATH} className={linkClass}>
          <Card>
            <CardHeader title="훈련" subtitle="참여 중인 프로그램" />
            <ul className="divide-y divide-muted">
              {programs.slice(0, 3).map((p) => (
                <li key={p.id} className="px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{p.name}</span>
                    {p.myRole === "secretary" && <Badge>총무</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{trainingLine(p)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </a>
  );
}

/** 통독 요약 카드. */
export function TongdokSummaryCard({ cohorts }: { cohorts: TongdokCohortSummary[] }) {
  return (
        <a href={TONGDOK_SSO_ENTRY_PATH} className={linkClass}>
          <Card>
            <CardHeader title="통독" subtitle="참여 중인 기수" />
            <ul className="divide-y divide-muted">
              {cohorts.slice(0, 3).map((c) => (
                <li key={c.slug} className="px-4 py-3 sm:px-5">
                  <span className="font-medium text-foreground">{c.title}</span>
                  <p className="mt-1 text-sm text-muted-foreground">{tongdokLine(c)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </a>
  );
}

/** 요약이 대신하는 앱 바로가기. 통독은 현재 홈 바로가기 카드가 없다. */
export function isTrainingShortcut(card: HomeCard) {
  return card.id === "training_hub";
}

