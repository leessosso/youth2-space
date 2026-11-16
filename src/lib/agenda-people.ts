import { OFFICER_TITLES } from "@/lib/types";

export type AgendaPerson = {
  userId: string;
  name: string;
  /** 임원 직책 또는 가장. */
  title: string;
  group: "officer" | "leader";
};

const OFFICER_ORDER = new Map<string, number>(OFFICER_TITLES.map((title, index) => [title, index]));

export function agendaPersonLabel(person: Pick<AgendaPerson, "name" | "title">): string {
  return `${person.name} ${person.title}`;
}

/** 임원은 직책 순, 가장은 이름 순. 임원이면서 가장인 사람은 임원으로만 둔다. */
export function buildAgendaPeople(input: {
  officers: { userId: string; name: string; title: string }[];
  leaders: { userId: string; name: string }[];
}): AgendaPerson[] {
  const officers: AgendaPerson[] = [];
  const seen = new Set<string>();
  const sortedOfficers = [...input.officers].sort(
    (a, b) => (OFFICER_ORDER.get(a.title) ?? 99) - (OFFICER_ORDER.get(b.title) ?? 99),
  );
  for (const officer of sortedOfficers) {
    if (!officer.userId || !officer.name || seen.has(officer.userId)) continue;
    seen.add(officer.userId);
    officers.push({
      userId: officer.userId,
      name: officer.name,
      title: officer.title,
      group: "officer",
    });
  }

  const leaders: AgendaPerson[] = [];
  const sortedLeaders = [...input.leaders].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  for (const leader of sortedLeaders) {
    if (!leader.userId || !leader.name || seen.has(leader.userId)) continue;
    seen.add(leader.userId);
    leaders.push({
      userId: leader.userId,
      name: leader.name,
      title: "가장",
      group: "leader",
    });
  }

  return [...officers, ...leaders];
}

/** 예배 순서 담당. 해당 반기 가장을 먼저 두고, 나머지 계정은 따로 둔다. */
export function worshipPeopleGroups<T extends { userId: string; name: string }>(
  people: T[],
  headIds: Iterable<string>,
): { heads: T[]; others: T[] } {
  const heads = new Set(headIds);
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, "ko") || a.userId.localeCompare(b.userId));
  return {
    heads: sorted.filter((person) => heads.has(person.userId)),
    others: sorted.filter((person) => !heads.has(person.userId)),
  };
}

/** 저장된 값이 사용자 id면 이름과 직책으로, 예전 글이면 그 글 그대로 보여 준다. */
export function agendaOwnerText(
  stored: string,
  role: string,
  people: AgendaPerson[],
  extraName?: string,
): string {
  const person = people.find((item) => item.userId === stored);
  if (person) return agendaPersonLabel(person);
  if (extraName) return extraName;
  if (!stored || stored === role) return role;
  return stored;
}
