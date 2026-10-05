import NextAuth from "next-auth";
import type { NextFetchEvent, NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { proxyTongdokRootFlightRequest } from "@/lib/platform/tongdok-flight-proxy";

/**
 * `auth(callback)` 형태는 callback이 undefined를 반환하면 `authorized: false`일 때도
 * NextResponse.next()로 빠져 셸 로그인 리다이렉트가 실행되지 않습니다.
 * 통독 루트 flight만 선처리한 뒤 기본 auth middleware를 호출합니다.
 */
const withAuth = NextAuth(authConfig).auth as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => Response | Promise<Response>;

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const tongdokFlight = proxyTongdokRootFlightRequest(request);
  if (tongdokFlight) {
    return tongdokFlight;
  }

  return withAuth(request, event);
}

export const config = {
  matcher: [
    // api/platform/* 는 라우트에서 자체 auth·mustChangePassword 처리 (미들웨어 JWT 이중 검증·Firebase 유발 방지)
    "/((?!api/auth|api/cron|api/platform|_next/static|_next/image|favicon.ico|favicon.png|manifest.webmanifest|firebase-messaging-sw.js|icons/).*)",
  ],
};
