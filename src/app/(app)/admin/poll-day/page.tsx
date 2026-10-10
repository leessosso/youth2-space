import Link from "next/link";
import { redirect } from "next/navigation";
import { clearPollDayAction, setPollDayAction } from "@/app/actions";
import { Button, Card, CardHeader, Input, Label } from "@/components/ui";
import { currentUserCanManageApp } from "@/lib/auth";
import { kstDateKeyNow } from "@/lib/kst-date";
import { isPollBannerDay } from "@/lib/poll-day";
import { getPollSiteUrl } from "@/lib/poll-site";
import { getPollDaySettings } from "@/lib/store/poll-day";

function formatPollDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

export default async function PollDayAdminPage() {
  if (!(await currentUserCanManageApp())) redirect("/dashboard");

  const [settings, seoulToday] = await Promise.all([
    getPollDaySettings(),
    Promise.resolve(kstDateKeyNow()),
  ]);
  const bannerActive = settings ? isPollBannerDay(settings.dateKey) : false;
  const pollSiteUrl = getPollSiteUrl();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">투표일 설정</h2>
        <p className="mt-1 text-sm text-stone-600">
          투표일은 Asia/Seoul 달력 기준입니다. 지정한 날에만 홈 상단에 배너 1개가 표시되며, poll에서
          안건을 만들어도 배너는 자동으로 생기지 않습니다.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          배너 링크:{" "}
          <a href={pollSiteUrl} className="break-all text-primary underline">
            {pollSiteUrl}
          </a>
          {process.env.POLL_SITE_URL ? null : (
            <span className="text-stone-400"> (기본값 · POLL_SITE_URL로 변경 가능)</span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader title="현재 상태" />
        <div className="space-y-2 px-4 py-4 text-sm sm:px-5">
          <p>
            서울 기준 오늘: <span className="font-medium">{formatPollDateKey(seoulToday)}</span>
          </p>
          <p>
            지정된 투표일:{" "}
            {settings ? (
              <span className="font-medium">{formatPollDateKey(settings.dateKey)}</span>
            ) : (
              <span className="text-muted-foreground">없음</span>
            )}
          </p>
          <p>
            홈 배너:{" "}
            {bannerActive ? (
              <span className="font-medium text-primary">오늘 노출 중</span>
            ) : (
              <span className="text-muted-foreground">노출 안 함</span>
            )}
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="투표일 지정" subtitle="목사·청년회 임원(앱 운영 권한)만 변경할 수 있습니다." />
        <form
          action={async (formData) => {
            "use server";
            await setPollDayAction(formData);
          }}
          className="space-y-4 px-4 py-4 sm:px-5"
        >
          <div>
            <Label>투표일 (서울 달력)</Label>
            <Input
              type="date"
              name="dateKey"
              required
              defaultValue={settings?.dateKey ?? ""}
              className="max-w-xs"
            />
          </div>
          <Button type="submit">저장</Button>
        </form>
      </Card>

      {settings && (
        <Card>
          <CardHeader title="투표일 해제" subtitle="배너를 더 이상 띄우지 않습니다." />
          <form
            action={async () => {
              "use server";
              await clearPollDayAction();
            }}
            className="px-4 py-4 sm:px-5"
          >
            <Button type="submit" variant="secondary">
              투표일 지우기
            </Button>
          </form>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/dashboard" className="underline">
          대시보드로 돌아가기
        </Link>
      </p>
    </div>
  );
}
