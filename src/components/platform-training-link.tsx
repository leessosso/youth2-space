import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";

const linkClass =
  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-muted";

/** 훈련 SSO는 전체 페이지 이동이 필요하므로 next/link를 쓰지 않습니다. */
export function PlatformTrainingLink({ className = "" }: { className?: string }) {
  return (
    <a href={TRAINING_SSO_ENTRY_PATH} className={`${linkClass} ${className}`}>
      훈련으로 가기
    </a>
  );
}
