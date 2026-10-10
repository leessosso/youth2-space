import Link from "next/link";
import { Badge } from "@/components/ui";

export function PollDayBanner({ href }: { href: string }) {
  const external = href.startsWith("http://") || href.startsWith("https://");

  const inner = (
    <>
      <Badge tone="accent" shape="tag" className="shrink-0">
        투표일
      </Badge>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-primary">총회 투표에 참여해 주세요</span>
        <span className="mt-0.5 block text-sm text-stone-600">
          배너를 눌러 투표 사이트로 이동합니다. 현장 입장(코드·이름)으로 참여할 수 있습니다.
        </span>
      </span>
      <span className="shrink-0 text-sm font-medium text-primary" aria-hidden>
        이동 →
      </span>
    </>
  );

  const className =
    "flex w-full items-start gap-3 rounded-2xl border border-primary/20 bg-surface px-4 py-4 text-left shadow-sm transition hover:border-primary/35 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:items-center sm:px-5";

  if (external) {
    return (
      <a href={href} className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
