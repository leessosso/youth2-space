"use server";

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isPhoneLike, normalizePhone } from "@/lib/phone";
import { getUserById, isPhoneUsedByAnotherUser, updateUserPassword, updateUserPhone } from "@/lib/store/users";

/** 내 정보: 모든 역할이 본인 계정에만 쓴다. */
async function me() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");
  return user;
}

export async function changeMyPasswordAction(formData: FormData) {
  const user = await me();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!(await verifyPassword(current, user.passwordHash))) redirect("/me?pw=wrong");
  if (next.length < 8) redirect("/me?pw=weak");
  if (next !== confirm) redirect("/me?pw=mismatch");
  if (next === current) redirect("/me?pw=same");

  await updateUserPassword(user.id, await hashPassword(next));
  redirect("/me?pw=ok");
}

/** 전화번호는 선택. 비우면 삭제한다. 다른 계정과 겹치면 거부(전화번호 로그인이 깨지지 않게). */
export async function updateMyPhoneAction(formData: FormData) {
  const user = await me();
  const raw = String(formData.get("phone") ?? "").trim();

  if (!raw) {
    await updateUserPhone(user.id, null);
    await unstable_update({ user: { phone: null } });
    redirect("/me?phone=ok");
  }
  if (!isPhoneLike(raw)) redirect("/me?phone=invalid");
  const phone = normalizePhone(raw);
  if (await isPhoneUsedByAnotherUser(phone, user.id)) redirect("/me?phone=taken");

  await updateUserPhone(user.id, phone);
  await unstable_update({ user: { phone } });
  redirect("/me?phone=ok");
}
