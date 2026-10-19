import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFamilyFormationTemplate,
  checkFormationAgainstRoster,
  describeFormationResult,
  googleSheetExportUrl,
  parseFamilyFormationLines,
  parseFamilyFormationWorkbook,
} from "../src/lib/family-formation";

describe("가족편성 표", () => {
  it("가족명과 이름만 읽어 가족별로 모은다", () => {
    const parsed = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["민석이네", "홍재영"] },
      { row: 3, cells: ["민석이네", "김새"] },
      { row: 4, cells: ["건우네", "이하나"] },
    ]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.families.length, 2);
    assert.deepEqual(parsed.families[0]?.members.map((member) => member.name), ["홍재영", "김새"]);
    assert.deepEqual(parsed.families[1]?.members.map((member) => member.name), ["이하나"]);
  });

  it("칸 순서가 달라도 헤더 이름으로 읽는다", () => {
    const parsed = parseFamilyFormationLines([
      { row: 1, cells: ["안내 제목"] },
      { row: 2, cells: ["이름", "가족"] },
      { row: 3, cells: ["홍길동", "길동이네"] },
    ]);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.families[0]?.name, "길동이네");
    assert.equal(parsed.families[0]?.members[0]?.name, "홍길동");
  });

  it("가족명이나 이름이 비면 거절한다", () => {
    const parsed = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["민석이네", ""] },
    ]);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /가족명과 이름/);
  });

  it("같은 사람이 두 번 나오면 거절한다", () => {
    const parsed = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["민석이네", "홍재영"] },
      { row: 3, cells: ["건우네", "홍재영"] },
    ]);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /두 번/);
  });

  it("이번 학기에 없는 가족과, 다른 가족 가장은 받지 않는다", () => {
    const families = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["새네", "홍재영"] },
      { row: 3, cells: ["민석이네", "송민석"] },
    ]);
    assert.equal(families.ok, true);
    if (!families.ok) return;
    const error = checkFormationAgainstRoster(families.families, {
      members: [
        { name: "홍재영", userId: null },
        { name: "송민석", userId: "leader-1" },
      ],
      groups: [{ name: "민석이네", currentLeaderId: "leader-1" }],
    });
    assert.match(error ?? "", /새네 가족이 이번 학기에 없습니다/);
  });

  it("다른 가족 가장은 옮기지 않는다", () => {
    const families = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["건우네", "송민석"] },
    ]);
    assert.equal(families.ok, true);
    if (!families.ok) return;
    const error = checkFormationAgainstRoster(families.families, {
      members: [{ name: "송민석", userId: "leader-1" }],
      groups: [
        { name: "민석이네", currentLeaderId: "leader-1" },
        { name: "건우네", currentLeaderId: "leader-2" },
      ],
    });
    assert.match(error ?? "", /민석이네 가장/);
  });

  it("자기 가족에 적힌 가장은 그대로 둔다", () => {
    const families = parseFamilyFormationLines([
      { row: 1, cells: ["가족명", "이름"] },
      { row: 2, cells: ["민석이네", "송민석"] },
      { row: 3, cells: ["민석이네", "홍재영"] },
    ]);
    assert.equal(families.ok, true);
    if (!families.ok) return;
    const error = checkFormationAgainstRoster(families.families, {
      members: [
        { name: "송민석", userId: "leader-1" },
        { name: "홍재영", userId: null },
      ],
      groups: [{ name: "민석이네", currentLeaderId: "leader-1" }],
    });
    assert.equal(error, null);
  });

  it("구글 시트 주소만 내보낸다", () => {
    const ok = googleSheetExportUrl("https://docs.google.com/spreadsheets/d/abc_DEF-123/edit?usp=sharing");
    assert.equal(ok.ok, true);
    if (!ok.ok) return;
    assert.equal(ok.url, "https://docs.google.com/spreadsheets/d/abc_DEF-123/export?format=xlsx");
    const rejected = googleSheetExportUrl("https://example.com/spreadsheets/d/abc/edit");
    assert.equal(rejected.ok, false);
  });

  it("빈 양식은 가족편성 시트만 보고 사람이 없다고 한다", async () => {
    const buffer = await buildFamilyFormationTemplate();
    const parsed = await parseFamilyFormationWorkbook(buffer);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.match(parsed.error, /올릴 가족이 없습니다/);
  });

  it("반영 결과를 문장으로 적는다", () => {
    assert.equal(
      describeFormationResult({ membersCreated: 0, membersMoved: 0 }),
      "표와 같은 편성이 이미 되어 있습니다.",
    );
    assert.match(describeFormationResult({ membersCreated: 2, membersMoved: 1 }), /명단에 넣었습니다/);
  });
});
