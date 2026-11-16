import assert from "node:assert/strict";
import { test } from "node:test";
import {
  annualPointsFromWeekly,
  applyTeamForm,
  assemblyFromForm,
  blankAssembly,
  canViewAssembly,
  editableTeamKeys,
  normalizeAssembly,
  nextAssemblyFrom,
  weeklyHeadcount,
  weekPointsForMonth,
  worshipDateFromInput,
  worshipDateToInput,
  type SundayHeadcount,
} from "../src/lib/monthly-assembly";
import type { User } from "../src/lib/types";

const officer = { id: "officer", role: "LEADER", officerTitle: "총무" } as User;
const leader = { id: "leader", role: "LEADER", officerTitle: null } as User;
const guest = { id: "guest", role: "ATTENDEE", officerTitle: null } as User;

test("출석·온라인만 인원으로 센다", () => {
  const counts = weeklyHeadcount([
    { s13: { status: "present" }, s4: { status: "none" } },
    { s13: { status: "none" }, s4: { status: "broadcast" } },
    { s13: { status: "none" }, s4: { status: "none" } },
  ]);
  assert.deepEqual(counts, { dept13: 1, dept4: 1 });
});

test("지난달 주별과 연간 평균", () => {
  const counts: SundayHeadcount[] = [
    { dateKey: "2026-07-05", dept4: 169, dept13: 70 },
    { dateKey: "2026-07-12", dept4: 148, dept13: 53 },
    { dateKey: "2026-06-07", dept4: 100, dept13: 40 },
    { dateKey: "2026-06-14", dept4: 120, dept13: 60 },
  ];
  assert.deepEqual(weekPointsForMonth(counts, 2026, 7), [
    { label: "5일", dept4: 169, dept13: 70 },
    { label: "12일", dept4: 148, dept13: 53 },
  ]);
  const annual = annualPointsFromWeekly(counts, 2026, 8, 3);
  assert.deepEqual(annual, [
    { label: "26년 6월", dept4: 110, dept13: 50 },
    { label: "26년 7월", dept4: 159, dept13: 62 },
  ]);
});

test("발행본은 가장이 보고, 작성 중은 담당 팀장과 임원만 본다", () => {
  const draft = blankAssembly(2026, 9);
  draft.teams = draft.teams.map((team) =>
    team.teamKey === "heim" ? { ...team, editorUserId: leader.id } : team,
  );
  assert.equal(canViewAssembly(guest, { ...draft, status: "published" }), false);
  assert.equal(canViewAssembly(leader, { ...draft, status: "published" }), true);
  assert.equal(canViewAssembly(leader, draft), true);
  assert.equal(canViewAssembly({ ...leader, id: "other" }, draft), false);
  assert.equal(canViewAssembly(officer, draft), true);
  assert.deepEqual(editableTeamKeys(leader, draft), ["heim"]);
  assert.deepEqual(editableTeamKeys(leader, { ...draft, status: "published" }), []);
  assert.equal(editableTeamKeys(officer, draft).length, 4);
});

test("다음 달은 이번 달 계획을 사역보고 초안으로 가져온다", () => {
  const current = blankAssembly(2026, 8);
  current.teams = current.teams.map((team) =>
    team.teamKey === "onsemiro" ? { ...team, thisMonth: "수요일 모임", editorUserId: "lead" } : team,
  );
  const next = nextAssemblyFrom(current, 2026, 9, "2026-09-01T00:00:00.000Z");
  const team = next.teams.find((item) => item.teamKey === "onsemiro");
  assert.equal(team?.lastMonth, "수요일 모임");
  assert.equal(team?.thisMonth, "");
  assert.equal(team?.editorUserId, "lead");
  assert.equal(next.status, "draft");
  assert.equal(next.heldAt, "");
});

test("팀장 저장은 담당자 지정을 지우지 않는다", () => {
  const current = blankAssembly(2026, 8);
  current.teams = current.teams.map((team) =>
    team.teamKey === "heim" ? { ...team, editorUserId: "lead" } : team,
  );
  const fd = new FormData();
  fd.set("last_heim", "지난 찬양");
  fd.set("plan_heim", "이번 연습");
  const next = applyTeamForm(current, "heim", fd);
  const team = next.teams.find((item) => item.teamKey === "heim");
  assert.equal(team?.editorUserId, "lead");
  assert.equal(team?.lastMonth, "지난 찬양");
  assert.equal(team?.thisMonth, "이번 연습");
});

test("사업보고는 지난달과 이번달 글만 저장한다", () => {
  const current = blankAssembly(2026, 8);
  const fd = new FormData();
  fd.set("verse", "시험 구절");
  fd.set("businessLast", "여름수련회\n일시: 7.2");
  fd.set("businessPlan", "가을 행사 준비");
  const next = assemblyFromForm(current, fd);
  assert.equal(next.verse, "시험 구절");
  assert.deepEqual(next.business, {
    lastMonth: "여름수련회\n일시: 7.2",
    thisMonth: "가을 행사 준비",
  });
});

test("예전 사업 목록은 지난달 글로 이어 읽는다", () => {
  const assembly = normalizeAssembly("2026-08", {
    business: [{ title: "여름수련회", date: "7.2", place: "수양관", people: "", note: "" }],
  });
  assert.equal(assembly.business.lastMonth, "여름수련회\n일시: 7.2 · 장소: 수양관");
  assert.equal(assembly.business.thisMonth, "");
});

test("예배 일시 8/2는 그해 달력 값으로 읽고, 저장은 8/2로 남긴다", () => {
  assert.equal(worshipDateToInput("8/2", 2026), "2026-08-02");
  assert.equal(worshipDateToInput("08/02", 2026), "2026-08-02");
  assert.equal(worshipDateToInput("2/29", 2026), "");
  assert.equal(worshipDateFromInput("2026-08-02"), "8/2");

  const current = blankAssembly(2026, 8);
  const fd = new FormData();
  fd.set("worship_0_date", "2026-08-02");
  fd.set("worship_0_sermon", "user-sermon");
  fd.set("worship_1_date", "8/9");
  const next = assemblyFromForm(current, fd);
  assert.equal(next.worship[0]?.date, "8/2");
  assert.equal(next.worship[0]?.sermon, "user-sermon");
  assert.equal(next.worship[1]?.date, "8/9");
});
