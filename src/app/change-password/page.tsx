import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { changePasswordAction } from "@/app/auth-actions";
import { Button, Card, Input, Label, Notice } from "@/components/ui";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.mustChangePassword) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md" padding="xl">
        <h1 className="text-2xl font-semibold text-foreground">비밀번호 변경</h1>
        <p className="mt-2 text-sm text-stone-600">
          운영자가 설정한 초기 비밀번호로 로그인했습니다. 계속하려면 새 비밀번호를 설정해 주세요.
        </p>
        {error === "mismatch" ? (
          <Notice className="mt-4">
            새 비밀번호가 일치하지 않습니다.
          </Notice>
        ) : null}
        {error === "weak" ? (
          <Notice className="mt-4">
            비밀번호는 8자 이상이어야 합니다.
          </Notice>
        ) : null}
        {error === "same" ? (
          <Notice className="mt-4">
            초기 비밀번호와 다른 비밀번호를 입력해 주세요.
          </Notice>
        ) : null}
        <form action={changePasswordAction} className="mt-6 space-y-4">
          <div>
            <Label>새 비밀번호</Label>
            <Input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label>새 비밀번호 확인</Label>
            <Input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">변경하고 계속</Button>
        </form>
      </Card>
    </div>
  );
}
