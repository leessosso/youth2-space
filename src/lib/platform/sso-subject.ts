import { ROLES, type Role, type User } from "@/lib/types";

export type SsoTicketSubject = Pick<User, "id" | "name" | "phone" | "role">;

type SessionLike = {
  user?: {
    id?: string;
    name?: string | null;
    role?: Role;
    /** 로그인 JWT에 실림. 구세션에는 없어 Firestore 폴백이 필요하다. */
    phone?: string | null;
  };
};

/**
 * SSO 티켓에 넣을 클레임을 세션에서 꺼낸다.
 * id/name/role/phone(null 포함)이 모두 있으면 Firestore 왕복을 생략한다.
 * phone 키가 없는 구 JWT는 null을 반환해 getUserById 폴백을 타게 한다.
 */
export function resolveSsoSubjectFromSession(
  session: SessionLike,
): SsoTicketSubject | null {
  const user = session.user;
  if (!user?.id || !user.name || !user.role) return null;
  if (!Object.prototype.hasOwnProperty.call(user, "phone")) return null;
  if (user.phone === undefined) return null;
  if (!ROLES.includes(user.role)) return null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}
