/**
 * Platform SSO (`training-sso` / `tongdok-sso`) Server-Timing + structured logs.
 * Never put the ticket JWT into Server-Timing or logs.
 */

export type SsoTimingSource = "session" | "firestore";

export type SsoTimingMarks = {
  authMs: number;
  /** resolveSsoSubjectFromSession (+ optional Firestore) wall time */
  subjectMs: number;
  /** Only set when Firestore getUserById ran */
  firestoreMs?: number;
  signMs: number;
  totalMs: number;
  source: SsoTimingSource;
};

function dur(ms: number): string {
  return ms.toFixed(1);
}

/** RFC 7230 Server-Timing value (ms). */
export function formatServerTiming(marks: SsoTimingMarks): string {
  const parts = [`auth;dur=${dur(marks.authMs)}`];

  if (marks.firestoreMs !== undefined) {
    parts.push(`firestore;dur=${dur(marks.firestoreMs)}`);
  } else {
    parts.push(`subject;dur=${dur(marks.subjectMs)}`);
  }

  parts.push(
    `sign;dur=${dur(marks.signMs)}`,
    `source;desc="${marks.source}"`,
    `total;dur=${dur(marks.totalMs)}`,
  );

  return parts.join(", ");
}

/** Cheap timing for early redirects (login / change-password / errors). */
export function formatPartialServerTiming(parts: {
  authMs?: number;
  totalMs: number;
  reason: string;
}): string {
  const out: string[] = [];
  if (parts.authMs !== undefined) {
    out.push(`auth;dur=${dur(parts.authMs)}`);
  }
  out.push(`source;desc="${parts.reason}"`, `total;dur=${dur(parts.totalMs)}`);
  return out.join(", ");
}

export function logSsoTiming(
  route: "training-sso" | "tongdok-sso",
  marks: SsoTimingMarks,
): void {
  console.info(
    JSON.stringify({
      msg: "platform_sso_timing",
      route,
      auth_ms: Number(marks.authMs.toFixed(1)),
      subject_ms: Number(marks.subjectMs.toFixed(1)),
      firestore_ms:
        marks.firestoreMs === undefined
          ? null
          : Number(marks.firestoreMs.toFixed(1)),
      sign_ms: Number(marks.signMs.toFixed(1)),
      total_ms: Number(marks.totalMs.toFixed(1)),
      source: marks.source,
    }),
  );
}

export function logSsoPartialTiming(
  route: "training-sso" | "tongdok-sso",
  parts: { authMs?: number; totalMs: number; reason: string },
): void {
  console.info(
    JSON.stringify({
      msg: "platform_sso_timing",
      route,
      auth_ms:
        parts.authMs === undefined ? null : Number(parts.authMs.toFixed(1)),
      total_ms: Number(parts.totalMs.toFixed(1)),
      source: parts.reason,
    }),
  );
}

export function applyServerTiming(
  response: Response,
  value: string,
): Response {
  response.headers.set("Server-Timing", value);
  return response;
}

export function nowMs(): number {
  return performance.now();
}
