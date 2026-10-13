import { redirect } from "next/navigation";
import { changeMyPasswordAction, updateMyPhoneAction } from "@/app/me-actions";
import { Button, Card, CardHeader, Input, Label, Notice } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { accountLabel } from "@/lib/format";
import { getGroupById, getMemberByUserId } from "@/lib/store/groups";

const PASSWORD_MESSAGES: Record<string, { tone: "success" | "destructive"; text: string }> = {
  ok: { tone: "success", text: "비밀번호를 바꿨습니다." },
  wrong: { tone: "destructive", text: "현재 비밀번호가 올바르지 않습니다." },
  weak: { tone: "destructive", text: "새 비밀번호는 8자 이상이어야 합니다." },
  mismatch: { tone: "destructive", text: "새 비밀번호가 일치하지 않습니다." },
  same: { tone: "destructive", text: "현재 비밀번호와 다른 비밀번호를 입력해 주세요." },
};

const PHONE_MESSAGES: Record<string, { tone: "success" | "destructive"; text: string }> = {
  ok: { tone: "success", text: "전화번호를 저장했습니다." },
  invalid: { tone: "destructive", text: "전화번호 형식을 확인해 주세요." },
  taken: { tone: "destructive", text: "다른 계정에 등록된 번호입니다. 운영자에게 문의해 주세요." },
};

export default async function MyInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string; phone?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;

  const member = await getMemberByUserId(user.id);
  const group = member?.groupId ? await getGroupById(member.groupId) : null;
  const pwMessage = query.pw ? PASSWORD_MESSAGES[query.pw] : undefined;
  const phoneMessage = query.phone ? PHONE_MESSAGES[query.phone] : undefined;

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-xl font-semibold">내 정보</h2>

      <Card>
        <CardHeader title="기본 정보" />
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2 p-4 text-sm sm:p-5">
          <dt className="text-muted-foreground">이름</dt>
          <dd className="font-medium text-foreground">{user.name}</dd>
          <dt className="text-muted-foreground">가족</dt>
          <dd className="text-foreground">{group?.name ?? "미배정"}</dd>
          <dt className="text-muted-foreground">계정</dt>
          <dd className="text-foreground">{accountLabel(user)}</dd>
        </dl>
      </Card>

      <Card padding="md">
        <h3 className="font-medium text-foreground">전화번호 (선택)</h3>
        <p className="mt-1 text-sm text-stone-600">등록하면 이름 대신 전화번호로도 로그인할 수 있습니다.</p>
        {phoneMessage && <Notice tone={phoneMessage.tone} className="mt-3">{phoneMessage.text}</Notice>}
        <form action={updateMyPhoneAction} className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label>전화번호</Label>
            <Input name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="01012345678" autoComplete="tel" />
          </div>
          <Button type="submit" variant="secondary">저장</Button>
        </form>
      </Card>

      <Card padding="md">
        <h3 className="font-medium text-foreground">비밀번호 변경</h3>
        {pwMessage && <Notice tone={pwMessage.tone} className="mt-3">{pwMessage.text}</Notice>}
        <form action={changeMyPasswordAction} className="mt-4 space-y-4">
          <div>
            <Label>현재 비밀번호</Label>
            <Input name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div>
            <Label>새 비밀번호</Label>
            <Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <Label>새 비밀번호 확인</Label>
            <Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <Button type="submit">비밀번호 변경</Button>
        </form>
      </Card>
    </div>
  );
}
