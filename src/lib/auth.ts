import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGroupById, getMemberById } from "@/lib/store/groups";
import { getUserById } from "@/lib/store/users";
import { isPastorOrAdmin, canManageApp, isLeaderTier, isMeetingAttendee, type Role } from "@/lib/types";

export { isPastorOrAdmin };

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getUserById(session.user.id);
}

/**
 * 리더 화면 서버 가드. 미들웨어와 별개로 페이지 첫 줄에서 부른다.
 * 역할은 JWT가 아니라 Firestore 계정 기준이라, 강등(가장 초기화) 직후에도 바로 막힌다.
 * `allowAttendee`: 리더모임처럼 ATTENDEE도 보는 화면.
 */
export async function requireLeaderTier(options: { allowAttendee?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");
  if (isLeaderTier(user.role)) return user;
  if (options.allowAttendee && isMeetingAttendee(user.role)) return user;
  redirect(isMeetingAttendee(user.role) ? "/meetings" : "/dashboard");
}

export async function currentUserCanManageApp() {
  const user = await getCurrentUser();
  return user ? canManageApp(user) : false;
}

/** 그 가족원이 속한 가족의 현재 가장인지 확인 (돌봄카드 권한에도 그대로 쓰인다) */
export async function leaderCanAccessMember(userId: string, memberId: string) {
  const member = await getMemberById(memberId);
  if (!member) return false;
  const group = await getGroupById(member.groupId);
  if (!group?.currentLeaderId) return false;
  return group.currentLeaderId === userId;
}

export async function leaderCanAccessGroup(userId: string, groupId: string) {
  const group = await getGroupById(groupId);
  return group?.currentLeaderId === userId;
}

export type { Role };
