import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthlyAssemblyForm } from "@/components/monthly-assembly-form";
import { getCurrentUser } from "@/lib/auth";
import { assemblyTitle, canViewAssembly, editableTeamKeys } from "@/lib/monthly-assembly";
import { getMonthlyAssembly } from "@/lib/store/monthly-assemblies";
import { listAllUsers } from "@/lib/store/users";
import { isMeetingAttendee } from "@/lib/types";

export default async function AssemblyEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attendance?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const assembly = await getMonthlyAssembly(id);
  if (!user || !assembly || !canViewAssembly(user, assembly)) notFound();

  const teamKeys = editableTeamKeys(user, assembly);
  if (teamKeys.length === 0) notFound();

  const users = (await listAllUsers()).filter((member) => !isMeetingAttendee(member.role));
  const attendanceNote =
    query.attendance === "filled"
      ? "출석 기록으로 칸을 채웠습니다."
      : query.attendance === "empty"
        ? "가져올 출석 기록이 없어 기존 숫자를 그대로 두었습니다."
        : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href={`/assemblies/${assembly.id}`} className="text-sm text-muted-foreground">
          자료 보기
        </Link>
        <h2 className="mt-1 text-xl font-semibold">{assemblyTitle(assembly)} 입력</h2>
      </div>
      <MonthlyAssemblyForm
        assembly={assembly}
        users={users}
        teamKeys={teamKeys}
        attendanceNote={attendanceNote}
      />
    </div>
  );
}
