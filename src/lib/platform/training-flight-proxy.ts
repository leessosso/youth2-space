import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  TRAINING_PATH_PREFIX,
  TRAINING_ROOT_RSC_SEGMENT,
  resolveTrainingOrigin,
} from "@/lib/platform/training-proxy";

/**
 * 셸 App Router가 `/training` zone 루트 flight로 해석해 307 self-redirect·404를 내는 URL.
 * next.config `beforeFiles` rewrite보다 먼저 middleware에서 upstream으로 rewrite해야 한다.
 * (통독 `tongdok-flight-proxy`와 동일 계열 버그)
 */
export function isTrainingRootFlightProxyPath(pathname: string): boolean {
  return (
    pathname === `${TRAINING_PATH_PREFIX}.rsc` ||
    pathname === `${TRAINING_PATH_PREFIX}/${TRAINING_ROOT_RSC_SEGMENT}`
  );
}

/**
 * 훈련 루트 RSC flight를 class-management로 프록시. 해당 경로가 아니면 null.
 */
export function proxyTrainingRootFlightRequest(
  request: NextRequest,
): NextResponse | null {
  const pathname = request.nextUrl.pathname;
  if (!isTrainingRootFlightProxyPath(pathname)) {
    return null;
  }

  const origin = resolveTrainingOrigin();
  if (!origin) {
    return null;
  }

  const target = new URL(pathname, origin);
  target.search = request.nextUrl.search;

  // RSC flight 헤더는 NextResponse.rewrite가 upstream으로 전달한다.
  return NextResponse.rewrite(target);
}
