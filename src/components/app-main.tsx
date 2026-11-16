"use client";

import { usePathname } from "next/navigation";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const flush = pathname === "/hat" || pathname.startsWith("/hat/");

  if (flush) {
    return <main className="flex min-h-0 flex-1 flex-col">{children}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:px-0 print:py-0">
      {children}
    </main>
  );
}
