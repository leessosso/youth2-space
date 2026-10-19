import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildFamilyFormationTemplate } from "@/lib/family-formation";
import { getUserById } from "@/lib/store/users";
import { canManageApp } from "@/lib/types";

export async function GET() {
  const session = await auth();
  const user = session?.user?.id ? await getUserById(session.user.id) : null;
  if (!user || !canManageApp(user)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const buffer = await buildFamilyFormationTemplate();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename*=UTF-8''%EA%B0%80%EC%A1%B1%ED%8E%B8%EC%84%B1.xlsx",
    },
  });
}
