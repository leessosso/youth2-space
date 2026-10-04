"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { TONGDOK_SSO_ENTRY_PATH } from "@/lib/platform/tongdok-sso-constants";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";
import type { NavItem } from "@/components/app-nav";

function isActive(pathname: string, href: string) {
  if (href === "/hat") return pathname === "/hat";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkBase =
  "block rounded-lg px-3 py-2.5 text-sm transition-colors";
const linkInactive = "text-stone-700 hover:bg-stone-100";
const linkActive = "bg-primary/10 font-medium text-primary";

export function AppNavDrawer({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-foreground hover:bg-stone-100"
        aria-expanded={open}
        aria-controls={titleId}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
        {open ? (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="메뉴 닫기"
            onClick={close}
          />
          <div
            id={titleId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-label`}
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-border bg-surface shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p id={`${titleId}-label`} className="text-base font-semibold">
                메뉴
              </p>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-stone-100"
                aria-label="메뉴 닫기"
                onClick={close}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="리더 업무">
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`${linkBase} ${active ? linkActive : linkInactive}`}
                        onClick={close}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-t border-border px-3 py-4">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted">
                플랫폼
              </p>
              <a
                href={TRAINING_SSO_ENTRY_PATH}
                className={`${linkBase} ${linkInactive}`}
              >
                훈련으로 가기
              </a>
              <a
                href={TONGDOK_SSO_ENTRY_PATH}
                className={`${linkBase} ${linkInactive}`}
              >
                통독으로 가기
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
