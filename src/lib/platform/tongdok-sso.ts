import { SignJWT } from "jose";
import type { Role, User } from "@/lib/types";
import { normalizePhone } from "@/lib/phone";
import { TRAINING_SSO_ISSUER } from "@/lib/platform/training-sso-constants";
import {
  TONGDOK_SSO_AUDIENCE,
  TONGDOK_SSO_CONSUME_PATH,
  TONGDOK_SSO_TTL_SECONDS,
} from "@/lib/platform/tongdok-sso-constants";

export {
  TONGDOK_SSO_ENTRY_PATH,
  TONGDOK_SSO_CONSUME_PATH,
  TONGDOK_SSO_AUDIENCE,
  TONGDOK_SSO_TTL_SECONDS,
} from "@/lib/platform/tongdok-sso-constants";

export { TRAINING_SSO_ISSUER };

export type TongdokSsoClaims = {
  iss: typeof TRAINING_SSO_ISSUER;
  aud: typeof TONGDOK_SSO_AUDIENCE;
  sub: string;
  name: string;
  phone: string | null;
  role: Role;
};

function secretKey(): Uint8Array | null {
  const secret = process.env.PLATFORM_SSO_SECRET?.trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function isTongdokSsoConfigured(): boolean {
  return Boolean(process.env.PLATFORM_SSO_SECRET?.trim());
}

export async function mintTongdokSsoTicket(
  user: Pick<User, "id" | "name" | "phone" | "role">,
): Promise<string> {
  const key = secretKey();
  if (!key) {
    throw new Error("PLATFORM_SSO_SECRET is not configured");
  }

  const phone =
    user.phone && user.phone.trim() !== "" ? normalizePhone(user.phone) : null;

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    name: user.name,
    phone,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(TRAINING_SSO_ISSUER)
    .setAudience(TONGDOK_SSO_AUDIENCE)
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + TONGDOK_SSO_TTL_SECONDS)
    .sign(key);
}

export function tongdokSsoConsumeUrl(ticket: string, origin: string): URL {
  const url = new URL(TONGDOK_SSO_CONSUME_PATH, origin);
  url.searchParams.set("ticket", ticket);
  return url;
}
