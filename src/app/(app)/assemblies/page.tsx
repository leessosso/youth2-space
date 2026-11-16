import Link from "next/link";
import { createAssembly } from "@/app/assembly-actions";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { assemblyTitle, canManageAssembly, canViewAssembly } from "@/lib/monthly-assembly";
import { listMonthlyAssemblies } from "@/lib/store/monthly-assemblies";
import { isMeetingAttendee } from "@/lib/types";

export default async function AssembliesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;

  if (isMeetingAttendee(user.role)) {
    return (
      <div>
        <h2 className="text-xl font-semibold">월례회</h2>
        <p className="mt-2 text-sm text-stone-600">월례회 자료는 가장, 임원, 목사가 봅니다.</p>
      </div>
    );
  }

  const manages = canManageAssembly(user);
  const assemblies = (await listMonthlyAssemblies()).filter((assembly) => canViewAssembly(user, assembly));
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() + 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">월례회</h2>
        <p className="text-sm text-stone-600">
          매달 순서, 출석, 예배 섬김, 팀 사역, 사업과 일정을 한 자료로 모읍니다. 발행된 달만 모두가 보고 인쇄합니다.
        </p>
      </div>

      {params.error && (
        <p role="alert" className="text-sm text-destructive">
          {params.error}
        </p>
      )}

      <div className={manages ? "grid items-start gap-6 lg:grid-cols-[minmax(20rem,24rem)_1fr]" : "space-y-6"}>
        {manages && (
          <Card className="lg:sticky lg:top-8" padding="md">
            <h3 className="font-medium">새 달 만들기</h3>
            <form
              action={async (fd) => {
                "use server";
                await createAssembly(fd);
              }}
              className="mt-3 grid gap-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>연도</Label>
                  <Input name="year" type="number" required defaultValue={defaultYear} />
                </div>
                <div>
                  <Label>달</Label>
                  <Input name="month" type="number" required min={1} max={12} defaultValue={defaultMonth} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="copyPrevious" defaultChecked />
                이전 달의 임원, 팀, 출석 목표를 가져오기
              </label>
              <Button type="submit">만들기</Button>
            </form>
          </Card>
        )}

        <div className="grid gap-3">
          {assemblies.length === 0 ? (
            <Card padding="lg" tone="empty">
              아직 월례회 자료가 없습니다.
            </Card>
          ) : (
            assemblies.map((assembly) => (
              <Link key={assembly.id} href={`/assemblies/${assembly.id}`}>
                <Card padding="md" interactive className="flex items-center justify-between">
                  <span className="font-medium">{assemblyTitle(assembly)}</span>
                  <Badge tone={assembly.status === "published" ? "green" : "neutral"}>
                    {assembly.status === "published" ? "발행" : "작성 중"}
                  </Badge>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
