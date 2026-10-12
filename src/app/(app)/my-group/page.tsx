import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupByCurrentLeader } from "@/lib/store/groups";
import { requireLeaderTier } from "@/lib/auth";

/** 예전 「내 가족」 주소. 가장은 돌봄카드로, 그 외에는 대시보드로 보냅니다. */
export default async function MyGroupPage() {
  await requireLeaderTier();
  const session = await auth();
  if (session!.user.role === "LEADER") {
    const group = await getGroupByCurrentLeader(session!.user.id);
    if (group) redirect(`/reports/${group.id}`);
  }
  redirect("/dashboard");
}
