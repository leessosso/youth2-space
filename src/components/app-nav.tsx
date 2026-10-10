"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/hat") return pathname === "/hat";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase = "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors";
const linkInactive = "text-stone-700 hover:bg-muted";
const linkActive =
  "bg-primary/10 font-medium text-primary";

export function AppNav({
  items,
  variant,
}: {
  items: NavItem[];
  variant: "mobile" | "desktop";
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`${linkBase} ${active ? linkActive : linkInactive}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`${linkBase} ${active ? linkActive : linkInactive}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
