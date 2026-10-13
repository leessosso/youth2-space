import { SignJWT } from "jose";
import type { SummaryApp } from "@/lib/platform/summary/schema";

export const SUMMARY_ISSUER = "youth2-space";
export const SUMMARY_TYP = "platform-summary";
export const SUMMARY_TTL_SECONDS = 60;
export const SUMMARY_AUDIENCE: Record<SummaryApp, string> = {
  "class-management": "class-management-summary",
  tongdok: "tongdok-summary",
};

/** 요약 API용 Bearer 토큰. SSO 티켓과 키(PLATFORM_SUMMARY_SECRET)·aud·typ가 모두 다르다. */
export async function mintSummaryToken(
  app: SummaryApp,
  sub: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  return new SignJWT({ typ: SUMMARY_TYP })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SUMMARY_ISSUER)
    .setAudience(SUMMARY_AUDIENCE[app])
    .setSubject(sub)
    .setJti(crypto.randomUUID())
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + SUMMARY_TTL_SECONDS)
    .sign(new TextEncoder().encode(secret));
}
