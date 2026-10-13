import { normalizePhone } from "@/lib/phone";
import { usersCol, withId } from "@/lib/store/collections";
import type { AttendeeKind, OfficerTitle, Role, User } from "@/lib/types";

function withUserDefaults(user: User): User {
  return {
    ...user,
    phone: user.phone ?? null,
    mustChangePassword: user.mustChangePassword === true,
    attendeeKind: user.attendeeKind === "guest" || user.attendeeKind === "new_family" ? user.attendeeKind : null,
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const snap = await usersCol.where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  return withUserDefaults(withId(snap.docs[0]));
}

/** `name` 완전 일치. 동명이인이면 여러 건이 반환될 수 있다. */
export async function getUserByName(name: string): Promise<User[]> {
  const snap = await usersCol.where("name", "==", name).get();
  return snap.docs.map((doc) => withUserDefaults(withId(doc)));
}

/** 정규화된 전화번호로 로그인 계정 조회. */
export async function getUsersByPhone(phone: string): Promise<User[]> {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  const snap = await usersCol.where("phone", "==", normalized).get();
  return snap.docs.map((doc) => withUserDefaults(withId(doc)));
}

export async function getUserById(id: string): Promise<User | null> {
  const doc = await usersCol.doc(id).get();
  if (!doc.exists) return null;
  return withUserDefaults({ id: doc.id, ...doc.data()! });
}

export async function getUsersByIds(ids: string[]): Promise<Map<string, User>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, User>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      const user = await getUserById(id);
      if (user) map.set(id, user);
    }),
  );
  return map;
}

export async function listUsersByRole(role: Role): Promise<User[]> {
  const snap = await usersCol.where("role", "==", role).get();
  return snap.docs.map((doc) => withUserDefaults(withId(doc))).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function listAllUsers(): Promise<User[]> {
  const snap = await usersCol.get();
  return snap.docs.map((doc) => withUserDefaults(withId(doc))).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: Role;
  attendeeKind?: AttendeeKind | null;
  officerTitle?: OfficerTitle | null;
  mustChangePassword?: boolean;
}): Promise<User> {
  const ref = usersCol.doc();
  const phone = normalizePhone(data.phone);
  const user: Omit<User, "id"> = {
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    phone,
    mustChangePassword: data.mustChangePassword ?? true,
    role: data.role,
    attendeeKind: data.role === "ATTENDEE" ? data.attendeeKind ?? "guest" : null,
    officerTitle: data.officerTitle ?? null,
    createdAt: new Date().toISOString(),
  };
  await ref.set(user);
  return { id: ref.id, ...user };
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  await usersCol.doc(userId).update({
    passwordHash,
    mustChangePassword: false,
  });
}

export async function isPhoneUsedByAnotherUser(phone: string, excludeUserId?: string): Promise<boolean> {
  const users = await getUsersByPhone(phone);
  if (excludeUserId) {
    return users.some((u) => u.id !== excludeUserId);
  }
  return users.length > 0;
}

export async function updateUserPhone(userId: string, phone: string | null) {
  await usersCol.doc(userId).update({ phone: phone ? normalizePhone(phone) : null });
}

export async function updateOfficerTitle(userId: string, officerTitle: OfficerTitle | null) {
  await usersCol.doc(userId).update({ officerTitle });
}

export async function setUserRole(userId: string, role: Role, attendeeKind: AttendeeKind | null) {
  await usersCol.doc(userId).update({
    role,
    attendeeKind: role === "ATTENDEE" ? attendeeKind ?? "guest" : null,
  });
}

/** 로그인 계정 (목사·관리자·가장·리더모임 참석). */
export async function listLoginUsersForServing(): Promise<User[]> {
  const snap = await usersCol.get();
  return snap.docs
    .map((doc) => withUserDefaults(withId(doc)))
    .filter((u) => u.role === "PASTOR" || u.role === "LEADER" || u.role === "ADMIN" || u.role === "ATTENDEE")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
