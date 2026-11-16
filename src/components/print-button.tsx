"use client";

import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      PDF로 저장
    </Button>
  );
}
