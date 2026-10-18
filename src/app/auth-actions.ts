"use server";

import { redirect } from "next/navigation";
import { auth, unstable_update } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getUserById, updateUserPassword } from "@/lib/store/users";

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) redirect("/change-password?error=weak");
  if (newPassword !== confirmPassword) redirect("/change-password?error=mismatch");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (user.mustChangePassword && sameAsCurrent) {
    redirect("/change-password?error=same");
  }

  await updateUserPassword(user.id, await hashPassword(newPassword));
  await unstable_update({ user: { mustChangePassword: false } });
  redirect("/dashboard");
}

/** 이미 비밀번호를 바꾼 사용자가 내 계정에서 다시 변경한다. 현재 비밀번호를 확인한다. */
export async function changeOwnPasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) redirect("/account?error=weak");
  if (newPassword !== confirmPassword) redirect("/account?error=mismatch");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const currentOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentOk) redirect("/account?error=wrong");

  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsCurrent) redirect("/account?error=same");

  await updateUserPassword(user.id, await hashPassword(newPassword));
  redirect("/account?saved=1");
}
