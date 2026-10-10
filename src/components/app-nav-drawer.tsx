"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { TONGDOK_SSO_ENTRY_PATH } from "@/lib/platform/tongdok-sso-constants";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";
import type { NavItem } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function isActive(pathname: string, href: string) {
  if (href === "/hat") return pathname === "/hat";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase = "block rounded-lg px-3 py-2.5 text-sm transition-colors";
const linkInactive = "text-stone-700 hover:bg-muted";
const linkActive = "bg-primary/10 font-medium text-primary";

export function AppNavDrawer({
  items,
  footer,
}: {
  items: NavItem[];
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const [openForPath, setOpenForPath] = useState<string | null>(null);
  const open = openForPath === pathname;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => setOpenForPath(next ? pathname : null)}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        >
          {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        flush
        className="w-[min(100%,20rem)] sm:max-w-xs lg:hidden"
      >
        <SheetHeader variant="bar">
          <SheetTitle>메뉴</SheetTitle>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost-muted"
              size="icon-sm"
              aria-label="메뉴 닫기"
            >
              <XIcon className="size-5" />
            </Button>
          </SheetClose>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="리더 업무">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className={`${linkBase} ${active ? linkActive : linkInactive}`}
                    onClick={() => setOpenForPath(null)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border px-3 py-4">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            플랫폼
          </p>
          <a href={TRAINING_SSO_ENTRY_PATH} className={`${linkBase} ${linkInactive}`}>
            훈련으로 가기
          </a>
          <a href={TONGDOK_SSO_ENTRY_PATH} className={`${linkBase} ${linkInactive}`}>
            통독으로 가기
          </a>
        </div>
        {footer ? (
          <div className="border-t border-border px-3 py-4">{footer}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
