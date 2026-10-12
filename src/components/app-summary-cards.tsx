import { Badge, Card, CardHeader } from "@/components/ui";
import { fetchAppSummaries } from "@/lib/platform/summary/fetch";
import { tongdokLine, trainingLine } from "@/lib/platform/summary/schema";
import { TONGDOK_SSO_ENTRY_PATH } from "@/lib/platform/tongdok-sso-constants";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";

const linkClass =
  "block rounded-2xl transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/**
 * 훈련·통독 참여 요약 카드 (서버 컴포넌트, 대시보드에서 Suspense로 스트리밍).
 * 참여 중인 것이 없거나 호출이 실패하면 아무것도 그리지 않는다 → 기존 바로가기만 보인다.
 * SSO 진입은 전체 페이지 이동이어야 해서 next/link 대신 <a>를 쓴다.
 */
export async function AppSummaryCards({ sub }: { sub: string }) {
  const { training, tongdok } = await fetchAppSummaries(sub);
  const programs = training?.programs.filter((p) => p.status === "active") ?? [];
  const cohorts = tongdok?.cohorts ?? [];
  if (programs.length === 0 && cohorts.length === 0) return null;

  return (
    <section aria-label="훈련·통독 요약" className="grid gap-4 sm:grid-cols-2">
      {programs.length > 0 && (
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
      )}
      {cohorts.length > 0 && (
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
      )}
    </section>
  );
}
