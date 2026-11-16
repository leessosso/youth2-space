import { buildAgendaPeople, type AgendaPerson } from "@/lib/agenda-people";
import { listAllGroups } from "@/lib/store/groups";
import { listActiveOfficers } from "@/lib/store/officers";
import { getUsersByIds } from "@/lib/store/users";
import type { TermHalf } from "@/lib/term";

export function assemblyHalf(month: number): TermHalf {
  return month <= 6 ? "H1" : "H2";
}

/** 월례회가 속한 반기의 가장. 임원을 겸해도 포함한다. */
export async function loadTermHeadIds(year: number, month: number): Promise<string[]> {
  const half = assemblyHalf(month);
  const groups = await listAllGroups();
  return [
    ...new Set(
      groups
        .filter((group) => group.year === year && group.half === half && group.currentLeaderId)
        .map((group) => group.currentLeaderId as string),
    ),
  ];
}

/** 그 해 임원과, 월례회가 속한 반기의 가장. */
export async function loadAgendaPeople(year: number, month: number): Promise<AgendaPerson[]> {
  const half = assemblyHalf(month);
  const [appointments, groups] = await Promise.all([listActiveOfficers(year), listAllGroups()]);
  const leaderIds = groups
    .filter((group) => group.year === year && group.half === half && group.currentLeaderId)
    .map((group) => group.currentLeaderId as string);
  const users = await getUsersByIds([...appointments.map((appointment) => appointment.userId), ...leaderIds]);

  return buildAgendaPeople({
    officers: appointments.flatMap((appointment) => {
      const user = users.get(appointment.userId);
      if (!user) return [];
      return [{ userId: user.id, name: user.name, title: appointment.title }];
    }),
    leaders: leaderIds.flatMap((userId) => {
      const user = users.get(userId);
      if (!user) return [];
      return [{ userId: user.id, name: user.name }];
    }),
  });
}
