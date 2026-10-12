import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { resolveLoginUserThrottled } from "@/lib/login";
import { Button, Card, Input, Label, Notice } from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  credentials: "이름(또는 전화번호) 또는 비밀번호가 올바르지 않습니다.",
  duplicate_name:
    "같은 이름이 여러 명입니다. 명단에 이름 뒤 영문 글자가 붙어 있다면 그대로 입력해 주세요(예: 김태희A). 전화번호를 등록했다면 전화번호로도 로그인할 수 있습니다.",
  locked: "로그인에 여러 번 실패해 이 이름(전화번호)은 10분 동안 잠겼습니다. 잠시 후 다시 시도해 주세요.",
  email_not_allowed: "이메일로는 로그인할 수 없습니다. 이름 또는 전화번호를 사용해 주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    if (session.user.mustChangePassword) redirect("/change-password");
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.credentials : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 lg:justify-start lg:px-0">
      <div className="hidden h-screen w-[42%] max-w-xl flex-col justify-end bg-primary px-12 py-16 text-primary-foreground lg:flex">
        <h1 className="text-4xl font-semibold">2청년회</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-primary-foreground/80">
          리더모임 자료, 배정모자, 돌봄카드를 한곳에서 관리합니다.
        </p>
      </div>
      <Card className="w-full max-w-md lg:ml-16 xl:ml-24" padding="xl">
        <div className="mb-6 text-center lg:text-left">
          <h1 className="text-2xl font-semibold text-foreground">
            <span className="lg:hidden">2청년회</span>
            <span className="hidden lg:inline">로그인</span>
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            2청년회 성도라면 누구나 들어올 수 있습니다.
          </p>
        </div>
        {errorMessage ? (
          <Notice className="mb-4">
            {errorMessage}
          </Notice>
        ) : null}
        <form
          action={async (formData) => {
            "use server";
            const identifier = formData.get("identifier") as string;
            const password = formData.get("password") as string;
            const precheck = await resolveLoginUserThrottled(identifier, password);
            if (!precheck.ok) {
              const code =
                precheck.reason === "duplicate_name"
                  ? "duplicate_name"
                  : precheck.reason === "locked"
                    ? "locked"
                    : precheck.reason === "email_not_allowed"
                      ? "email_not_allowed"
                      : "credentials";
              redirect(`/login?error=${code}`);
            }
            try {
              await signIn("credentials", {
                identifier,
                password,
                redirectTo: precheck.user.mustChangePassword ? "/change-password" : "/dashboard",
              });
            } catch (err) {
              if (err instanceof AuthError) {
                redirect("/login?error=credentials");
              }
              throw err;
            }
          }}
          className="space-y-4"
        >
          <div>
            <Label>이름 또는 전화번호</Label>
            <Input
              name="identifier"
              type="text"
              required
              placeholder="홍길동 또는 01012345678"
              autoComplete="username"
            />
          </div>
          <div>
            <Label>비밀번호</Label>
            <Input name="password" type="password" required autoComplete="current-password" />
          </div>
          <Button type="submit" className="w-full">로그인</Button>
        </form>
        <div className="mt-6 rounded-lg bg-background p-4 text-xs text-stone-600">
          <p className="font-medium text-stone-800">처음 로그인 안내</p>
          <ul className="mt-2 space-y-1">
            <li>아이디: <span className="font-medium text-stone-800">본인 이름</span> (명단과 똑같이)</li>
            <li>
              같은 이름이 여러 명이면 이름 뒤 영문 글자까지 입력합니다. 예:{" "}
              <span className="font-medium text-stone-800">김태희A</span>
            </li>
            <li>초기 비밀번호는 가장·임원에게 안내받고, 첫 로그인 때 새 비밀번호로 바꿉니다.</li>
            <li>5번 틀리면 10분 동안 로그인이 잠깁니다.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
