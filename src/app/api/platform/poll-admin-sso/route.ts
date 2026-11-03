import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAdministerPoll, parsePollReturnTo, pollReturnUrlWithCode } from "@/lib/platform/poll-admin/contract";
import { currentShellUser, issuePollAdminCode, resolveMidForUser } from "@/lib/platform/poll-admin/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

/**
 * 투표 /admin → 셸 진입점. GET /api/platform/poll-admin-sso?return_to=<투표 관리자 URL>
 * 셸 관리자(ADMIN·PASTOR·임원)이면 60초 일회용 code를 발급해 return_to#code=… 로 돌려보낸다.
 */
export async function GET(request: Request) {
  const reqUrl = new URL(request.url);
  const returnTo = parsePollReturnTo(reqUrl.searchParams.get("return_to"));
  if (!returnTo) {
    return noStore(NextResponse.json({ error: "invalid_return_to" }, { status: 400 }));
  }

  const session = await auth();
  if (!session?.user?.id) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${reqUrl.pathname}${reqUrl.search}`);
    return noStore(NextResponse.redirect(login));
  }
  if (session.user.mustChangePassword) {
    return noStore(NextResponse.redirect(new URL("/change-password", request.url)));
  }

  // 세션 role·직책은 재로그인 전까지 옛 값일 수 있어 Firestore 현재 값으로 다시 본다.
  const shellUser = await currentShellUser(session.user.id);
  if (!canAdministerPoll(shellUser)) {
    return noStore(NextResponse.json({ error: "forbidden" }, { status: 403 }));
  }

  const mid = await resolveMidForUser(session.user.id);
  if (!mid) {
    return noStore(NextResponse.json({ error: "member_not_linked" }, { status: 403 }));
  }

  const code = await issuePollAdminCode(mid, session.user.id);
  return noStore(NextResponse.redirect(pollReturnUrlWithCode(returnTo, code)));
}
