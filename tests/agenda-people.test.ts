import assert from "node:assert/strict";
import { test } from "node:test";
import { agendaOwnerText, buildAgendaPeople, worshipPeopleGroups } from "../src/lib/agenda-people";

test("임원은 직책 순이고, 가장을 겸한 임원은 한 번만 나온다", () => {
  const people = buildAgendaPeople({
    officers: [
      { userId: "acct", name: "정효정", title: "회계" },
      { userId: "chair", name: "임범석", title: "회장" },
    ],
    leaders: [
      { userId: "chair", name: "임범석" },
      { userId: "head-b", name: "위성해" },
      { userId: "head-a", name: "김가장" },
    ],
  });

  assert.deepEqual(
    people.map((person) => `${person.group}:${person.name} ${person.title}`),
    ["officer:임범석 회장", "officer:정효정 회계", "leader:김가장 가장", "leader:위성해 가장"],
  );
});

test("예배 담당은 가장을 먼저 두고 나머지는 다른 사람으로 나눈다", () => {
  const groups = worshipPeopleGroups(
    [
      { userId: "officer", name: "이승석" },
      { userId: "head", name: "위성해" },
      { userId: "member", name: "김성도" },
    ],
    ["head"],
  );
  assert.deepEqual(groups.heads.map((person) => person.name), ["위성해"]);
  assert.deepEqual(groups.others.map((person) => person.name), ["김성도", "이승석"]);
});

test("담당 표시는 사용자, 예전 글, 직책 자리를 구분한다", () => {
  const people = buildAgendaPeople({
    officers: [{ userId: "vice", name: "김광림", title: "부회장" }],
    leaders: [],
  });

  assert.equal(agendaOwnerText("vice", "부회장", people), "김광림 부회장");
  assert.equal(agendaOwnerText("김광림 부회장", "부회장", people), "김광림 부회장");
  assert.equal(agendaOwnerText("부회장", "부회장", people), "부회장");
  assert.equal(agendaOwnerText("", "각 팀 팀장", people), "각 팀 팀장");
  assert.equal(agendaOwnerText("gone-user", "서기", people, "박기도"), "박기도");
});
