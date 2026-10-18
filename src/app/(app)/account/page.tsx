import { redirect } from "next/navigation";
import { changeOwnPasswordAction } from "@/app/auth-actions";
import { Button, Card, CardHeader, Input, Label, Notice } from "@/components/ui";
import { auth } from "@/auth";
import { accountLabel } from "@/lib/format";
import { getUserById } from "@/lib/store/users";

function formatPhone(phone: string) {
  if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
  return phone;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const { error, saved } = await searchParams;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">내 계정</h2>
        <p className="mt-1 text-sm text-stone-600">
          로그인에 쓰는 비밀번호를 바꿀 수 있습니다.
        </p>
      </div>

      <Card>
        <CardHeader title="계정 정보" />
        <dl className="space-y-2 px-4 py-4 text-sm sm:px-5">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">이름</dt>
            <dd className="font-medium">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">구분</dt>
            <dd className="font-medium">
              {accountLabel(user)}
              {user.officerTitle ? ` · ${user.officerTitle}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">전화번호</dt>
            <dd className="font-medium">{user.phone ? formatPhone(user.phone) : "없음"}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader
          title="비밀번호 변경"
          subtitle="현재 비밀번호를 확인한 뒤 8자 이상의 새 비밀번호를 설정합니다."
        />
        <form action={changeOwnPasswordAction} className="space-y-4 px-4 py-4 sm:px-5">
          {saved === "1" ? (
            <Notice tone="success">비밀번호를 변경했습니다.</Notice>
          ) : null}
          {error === "wrong" ? (
            <Notice>현재 비밀번호가 맞지 않습니다.</Notice>
          ) : null}
          {error === "mismatch" ? (
            <Notice>새 비밀번호가 일치하지 않습니다.</Notice>
          ) : null}
          {error === "weak" ? (
            <Notice>비밀번호는 8자 이상이어야 합니다.</Notice>
          ) : null}
          {error === "same" ? (
            <Notice>지금 쓰는 비밀번호와 다른 비밀번호를 입력해 주세요.</Notice>
          ) : null}
          <div>
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit">변경</Button>
        </form>
      </Card>
    </div>
  );
}
