import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/lib/store/users";
import { resolveSsoSubjectFromSession } from "@/lib/platform/sso-subject";
import {
  applyServerTiming,
  formatPartialServerTiming,
  formatServerTiming,
  logSsoPartialTiming,
  logSsoTiming,
  nowMs,
} from "@/lib/platform/sso-timing";
import {
  isTongdokSsoConfigured,
  mintTongdokSsoTicket,
  tongdokSsoConsumeUrl,
} from "@/lib/platform/tongdok-sso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Firestore(asia-northeast3)와 가깝게 — 폴백 getUserById·한국 사용자 TTFB. */
export const preferredRegion = "icn1";

const ROUTE = "tongdok-sso" as const;

export async function GET(request: Request) {
  const t0 = nowMs();

  const tAuth0 = nowMs();
  const session = await auth();
  const authMs = nowMs() - tAuth0;

  if (!session?.user?.id) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", new URL(request.url).pathname);
    const totalMs = nowMs() - t0;
    const header = formatPartialServerTiming({
      authMs,
      totalMs,
      reason: "unauth",
    });
    logSsoPartialTiming(ROUTE, { authMs, totalMs, reason: "unauth" });
    return applyServerTiming(NextResponse.redirect(login), header);
  }

  if (session.user.mustChangePassword) {
    const changeUrl = new URL("/change-password", request.url);
    const totalMs = nowMs() - t0;
    const header = formatPartialServerTiming({
      authMs,
      totalMs,
      reason: "must-change-password",
    });
    logSsoPartialTiming(ROUTE, {
      authMs,
      totalMs,
      reason: "must-change-password",
    });
    return applyServerTiming(NextResponse.redirect(changeUrl), header);
  }

  if (!isTongdokSsoConfigured()) {
    const totalMs = nowMs() - t0;
    const header = formatPartialServerTiming({
      authMs,
      totalMs,
      reason: "misconfigured",
    });
    logSsoPartialTiming(ROUTE, { authMs, totalMs, reason: "misconfigured" });
    return applyServerTiming(
      NextResponse.json(
        { error: "PLATFORM_SSO_SECRET is not configured" },
        { status: 503 },
      ),
      header,
    );
  }

  // 세션에 name/phone/role이 있으면 Firestore 왕복 생략 (구 JWT만 폴백).
  const tSubject0 = nowMs();
  const fromSession = resolveSsoSubjectFromSession(session);
  let firestoreMs: number | undefined;
  let user = fromSession;
  let source: "session" | "firestore" = "session";

  if (!user) {
    const tFs0 = nowMs();
    user = (await getUserById(session.user.id)) ?? null;
    firestoreMs = nowMs() - tFs0;
    source = "firestore";
  }
  const subjectMs = nowMs() - tSubject0;

  if (!user) {
    const totalMs = nowMs() - t0;
    const header = formatPartialServerTiming({
      authMs,
      totalMs,
      reason: "user-not-found",
    });
    logSsoPartialTiming(ROUTE, { authMs, totalMs, reason: "user-not-found" });
    return applyServerTiming(
      NextResponse.json({ error: "User not found" }, { status: 404 }),
      header,
    );
  }

  const tSign0 = nowMs();
  const ticket = await mintTongdokSsoTicket(user);
  const signMs = nowMs() - tSign0;
  const destination = tongdokSsoConsumeUrl(ticket, request.url);
  const totalMs = nowMs() - t0;

  const marks = {
    authMs,
    subjectMs,
    firestoreMs,
    signMs,
    totalMs,
    source,
  };
  const header = formatServerTiming(marks);
  logSsoTiming(ROUTE, marks);

  return applyServerTiming(NextResponse.redirect(destination), header);
}
