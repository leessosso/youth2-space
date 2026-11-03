import { importPKCS8, SignJWT } from "jose";

/**
 * Firebase 커스텀 토큰을 jose로 직접 서명한다.
 * firebase-admin/auth는 jwks-rsa가 jose v6(ESM 전용)를 require()해 Vercel 런타임에서 모듈 로드가 실패한다(ERR_REQUIRE_ESM).
 * 형식: https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
 */
export const FIREBASE_CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
export const FIREBASE_CUSTOM_TOKEN_TTL_SECONDS = 3600;

export type PollServiceAccount = { clientEmail: string; privateKey: string };

/** env 값의 리터럴 \n을 실제 줄바꿈으로 바꾼다. */
export function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n");
}

export function readPollServiceAccount(env: NodeJS.ProcessEnv = process.env): PollServiceAccount | null {
  const clientEmail = env.POLL_FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.POLL_FIREBASE_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey: normalizePrivateKey(privateKey) };
}

export async function signFirebaseCustomToken(
  account: PollServiceAccount,
  uid: string,
  claims: Record<string, unknown>,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const key = await importPKCS8(account.privateKey, "RS256");
  return new SignJWT({ uid, claims })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(account.clientEmail)
    .setSubject(account.clientEmail)
    .setAudience(FIREBASE_CUSTOM_TOKEN_AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + FIREBASE_CUSTOM_TOKEN_TTL_SECONDS)
    .sign(key);
}
