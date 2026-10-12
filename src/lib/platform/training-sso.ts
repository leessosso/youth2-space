import { SignJWT } from "jose";
import type { Role, User } from "@/lib/types";
import { normalizePhone } from "@/lib/phone";
import {
  TRAINING_SSO_AUDIENCE,
  TRAINING_SSO_ISSUER,
  TRAINING_SSO_TTL_SECONDS,
} from "@/lib/platform/training-sso-constants";

export {
  TRAINING_SSO_ENTRY_PATH,
  TRAINING_SSO_AUDIENCE,
  TRAINING_SSO_ISSUER,
  TRAINING_SSO_TTL_SECONDS,
} from "@/lib/platform/training-sso-constants";

export type TrainingSsoClaims = {
  iss: typeof TRAINING_SSO_ISSUER;
  aud: typeof TRAINING_SSO_AUDIENCE;
  sub: string;
  name: string;
  phone: string | null;
  role: Role;
  /** 티켓마다 새 UUID. 소비자는 1회용 검증(재사용 거부)에 쓸 수 있다. */
  jti: string;
  iat: number;
  exp: number;
};

function secretKey(): Uint8Array | null {
  const secret = process.env.PLATFORM_SSO_SECRET?.trim();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function isTrainingSsoConfigured(): boolean {
  return Boolean(process.env.PLATFORM_SSO_SECRET?.trim());
}

export async function mintTrainingSsoTicket(
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
    .setAudience(TRAINING_SSO_AUDIENCE)
    .setSubject(user.id)
    .setJti(crypto.randomUUID())
    .setIssuedAt(now)
    .setExpirationTime(now + TRAINING_SSO_TTL_SECONDS)
    .sign(key);
}

export function trainingSsoConsumeUrl(ticket: string, origin: string): URL {
  const url = new URL("/training/sso/consume", origin);
  url.searchParams.set("ticket", ticket);
  return url;
}
