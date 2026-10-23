"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/**
 * 임원·목사님에게만 보이는 입력 영역을 접어 둔다.
 * 입력할 게 늘어도 모임 화면 스크롤이 길어지지 않게 한다.
 */
export function MeetingEditorAccordion({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "edit" : undefined}>
      <AccordionItem value="edit">
        <AccordionTrigger>{label}</AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pt-1">{children}</div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
