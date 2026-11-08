import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangePollAdminCode, isAllowedPollOrigin } from "@/lib/platform/poll-admin/contract";
import {
  consumePollAdminCode,
  currentShellUser,
  isPollFirebaseConfigured,
  mintPollCustomToken,
} from "@/lib/platform/poll-admin/server";
import { logTokenMintFailure } from "@/lib/platform/poll-admin/token-mint-diagnostic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const preferredRegion = "icn1";

function corsHeaders(origin: string | null): Headers {
  const h = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (origin && isAllowedPollOrigin(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "600");
  }
  return h;
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!isAllowedPollOrigin(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  if (!isAllowedPollOrigin(origin)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers });
  }
  if (!isPollFirebaseConfigured()) {
    logTokenMintFailure("env_missing");
    return NextResponse.json({ error: "not_configured" }, { status: 500, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers });
  }

  const session = await auth().catch(() => null);
  const result = await exchangePollAdminCode(
    { body, sessionUserId: session?.user?.id ?? null },
    {
      consume: consumePollAdminCode,
      currentUser: currentShellUser,
      mintToken: mintPollCustomToken,
    },
  );
  if (result.status === 500 && result.body.error === "token_mint_failed") {
    logTokenMintFailure(result.body.reason);
  }
  return NextResponse.json(result.body, { status: result.status, headers });
}
