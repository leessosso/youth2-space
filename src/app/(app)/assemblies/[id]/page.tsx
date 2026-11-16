import Link from "next/link";
import { notFound } from "next/navigation";
import { publishAssembly, reopenAssembly } from "@/app/assembly-actions";
import { MonthlyPacket } from "@/components/monthly-packet";
import { PrintButton } from "@/components/print-button";
import { Badge, Button } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { agendaOwnerText } from "@/lib/agenda-people";
import {
  MONTHLY_AGENDA,
  WORSHIP_PERSON_FIELDS,
  assemblyTitle,
  canManageAssembly,
  canViewAssembly,
  editableTeamKeys,
} from "@/lib/monthly-assembly";
import { loadAgendaPeople } from "@/lib/store/agenda-people";
import { getMonthlyAssembly } from "@/lib/store/monthly-assemblies";
import { getUsersByIds } from "@/lib/store/users";
import type { User } from "@/lib/types";

export default async function AssemblyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const assembly = await getMonthlyAssembly(id);
  if (!user || !assembly || !canViewAssembly(user, assembly)) notFound();

  const manages = canManageAssembly(user);
  const canEdit = editableTeamKeys(user, assembly).length > 0;
  const agendaPeople = await loadAgendaPeople(assembly.year, assembly.month);
  const personIds = [
    ...assembly.agendaOwners,
    ...assembly.worship.flatMap((row) => WORSHIP_PERSON_FIELDS.map((field) => row[field.key])),
  ].filter(Boolean);
  const people = personIds.length > 0 ? await getUsersByIds(personIds) : new Map<string, User>();
  const personNames = Object.fromEntries([...people].map(([id, member]) => [id, member.name]));
  const ownerLabels = MONTHLY_AGENDA.map((item, index) => {
    const stored = assembly.agendaOwners[index] ?? "";
    return agendaOwnerText(stored, item.role, agendaPeople, personNames[stored]);
  });

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
      <MonthlyPacket assembly={assembly} ownerLabels={ownerLabels} personNames={personNames} />
    </div>
  );
}
