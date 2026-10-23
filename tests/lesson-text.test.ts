import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLessonText } from "../src/lib/lesson-text";

test("빈 값은 블록 없음", () => {
  assert.deepEqual(parseLessonText(null), []);
  assert.deepEqual(parseLessonText("  \n\n"), []);
});

test("문단 안 줄바꿈은 유지하고 빈 줄로 문단을 나눈다", () => {
  assert.deepEqual(parseLessonText("첫 줄\r\n둘째 줄\n\n다음 문단"), [
    { type: "paragraph", text: "첫 줄\n둘째 줄" },
    { type: "paragraph", text: "다음 문단" },
  ]);
});

test("제목과 목록을 해석한다", () => {
  assert.deepEqual(parseLessonText("# 1과\n## 들어가며\n- 하나\n* 둘\n1. 첫째\n2) 둘째\n본문"), [
    { type: "heading", level: 1, text: "1과" },
    { type: "heading", level: 2, text: "들어가며" },
    { type: "list", ordered: false, items: ["하나", "둘"] },
    { type: "list", ordered: true, items: ["첫째", "둘째"] },
    { type: "paragraph", text: "본문" },
  ]);
});

test("#만 있고 띄어쓰기 없는 줄은 일반 문단", () => {
  assert.deepEqual(parseLessonText("#해시태그"), [{ type: "paragraph", text: "#해시태그" }]);
});
