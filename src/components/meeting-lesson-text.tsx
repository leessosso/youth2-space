import { parseLessonText } from "@/lib/lesson-text";

/** 교안 텍스트를 모바일에서도 읽기 좋은 크기로 보여 준다. */
export function MeetingLessonText({ text }: { text: string | null | undefined }) {
  const blocks = parseLessonText(text);
  if (blocks.length === 0) return null;

  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface px-4 py-4 text-base leading-8 break-words text-foreground sm:px-5">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const size = block.level === 1 ? "text-xl" : block.level === 2 ? "text-lg" : "text-base";
          return (
            <h3 key={index} className={`${size} pt-1 font-semibold leading-snug`}>
              {block.text}
            </h3>
          );
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-6`}
            >
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap">
            {block.text}
          </p>
        );
      })}
    </article>
  );
}
