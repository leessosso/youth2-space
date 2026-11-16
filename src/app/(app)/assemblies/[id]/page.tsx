import Link from "next/link";
import { notFound } from "next/navigation";
import { publishAssembly, reopenAssembly } from "@/app/assembly-actions";
import { MonthlyPacket } from "@/components/monthly-packet";
import { PrintButton } from "@/components/print-button";
import { Badge, Button } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import {
  assemblyTitle,
  canManageAssembly,
  canViewAssembly,
  editableTeamKeys,
} from "@/lib/monthly-assembly";
import { getMonthlyAssembly } from "@/lib/store/monthly-assemblies";

export default async function AssemblyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const assembly = await getMonthlyAssembly(id);
  if (!user || !assembly || !canViewAssembly(user, assembly)) notFound();

  const manages = canManageAssembly(user);
  const canEdit = editableTeamKeys(user, assembly).length > 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link href="/assemblies" className="text-sm text-muted-foreground">
          월례회
        </Link>
        <h2 className="text-xl font-semibold">{assemblyTitle(assembly)}</h2>
        <Badge tone={assembly.status === "published" ? "green" : "neutral"}>
          {assembly.status === "published" ? "발행" : "작성 중"}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && (
            <Link href={`/assemblies/${assembly.id}/edit`}>
              <Button type="button" variant="secondary">
                수정
              </Button>
            </Link>
          )}
          <PrintButton />
          {manages && assembly.status === "draft" && (
            <form
              action={async () => {
                "use server";
                await publishAssembly(assembly.id);
              }}
            >
              <Button type="submit">발행</Button>
            </form>
          )}
          {manages && assembly.status === "published" && (
            <form
              action={async () => {
                "use server";
                await reopenAssembly(assembly.id);
              }}
            >
              <Button type="submit" variant="secondary">
                다시 작성
              </Button>
            </form>
          )}
        </div>
      </div>
      <MonthlyPacket assembly={assembly} />
    </div>
  );
}
