import { TONGDOK_SSO_ENTRY_PATH } from "@/lib/platform/tongdok-sso-constants";

const linkClass =
  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100";

/** 통독 티켓은 전체 페이지 이동이 필요하므로 next/link를 쓰지 않습니다. */
export function PlatformTongdokLink({ className = "" }: { className?: string }) {
  return (
    <a href={TONGDOK_SSO_ENTRY_PATH} className={`${linkClass} ${className}`}>
      통독으로 가기
    </a>
  );
}
