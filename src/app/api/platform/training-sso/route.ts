import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/store/users";
import { resolveSsoSubjectFromSession } from "@/lib/platform/sso-subject";
import {
  isTrainingSsoConfigured,
  mintTrainingSsoTicket,
  trainingSsoConsumeUrl,
} from "@/lib/platform/training-sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Firestore(asia-northeast3)와 가깝게 — 폴백 getUserById·한국 사용자 TTFB. */
export const preferredRegion = "icn1";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", new URL(request.url).pathname);
    return NextResponse.redirect(login);
  }

  if (session.user.mustChangePassword) {
    const changeUrl = new URL("/change-password", request.url);
    return NextResponse.redirect(changeUrl);
  }

  if (!isTrainingSsoConfigured()) {
    return NextResponse.json(
      { error: "PLATFORM_SSO_SECRET is not configured" },
      { status: 503 },
    );
  }

  // 세션에 name/phone/role이 있으면 Firestore 왕복 생략 (구 JWT만 폴백).
  const fromSession = resolveSsoSubjectFromSession(session);
  const user = fromSession ?? (await getUserById(session.user.id));
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const ticket = await mintTrainingSsoTicket(user);
  const destination = trainingSsoConsumeUrl(ticket, request.url);
  return NextResponse.redirect(destination);
}
