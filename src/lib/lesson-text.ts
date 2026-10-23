/**
 * 교안 텍스트를 읽기 좋은 블록으로 나눈다.
 * 워드에서 복사해 붙여 넣은 글을 그대로 받되, 간단한 마크다운만 해석한다.
 * - `# `, `## `, `### ` 제목
 * - `- `, `* `, `• ` 목록 / `1. `, `1) ` 번호 목록
 * - 빈 줄로 문단을 나누고, 문단 안 줄바꿈은 유지한다.
 */
export type LessonBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*•·]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseLessonText(source: string | null | undefined): LessonBlock[] {
  if (!source) return [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: LessonBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    const item = bullet ?? ordered;
    if (item) {
      flush();
      const isOrdered = !!ordered;
      const last = blocks[blocks.length - 1];
      if (last?.type === "list" && last.ordered === isOrdered) last.items.push(item[1].trim());
      else blocks.push({ type: "list", ordered: isOrdered, items: [item[1].trim()] });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}
