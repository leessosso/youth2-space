import Link from "next/link";
import { signOut } from "@/auth";
import type { OfficerTitle, Role } from "@/lib/types";
import { canManageApp } from "@/lib/types";
import { FitText } from "@/components/fit-text";
import { AppMain } from "@/components/app-main";
import { AppNav, type NavItem } from "@/components/app-nav";
import { AppNavDrawer } from "@/components/app-nav-drawer";
import { LeaderAxisChrome } from "@/components/leader-axis-chrome";
import { PlatformTongdokLink } from "@/components/platform-tongdok-link";
import { PlatformTrainingLink } from "@/components/platform-training-link";
import { SORTING_HAT_ADMIN_PATH, SORTING_HAT_USER_PATH } from "@/lib/sorting-hat";

function navFor(
  user: { role: Role; officerTitle: OfficerTitle | null },
  familyReportHref: string,
): NavItem[] {
  const manages = canManageApp(user);
  const items: NavItem[] = [
    { href: "/dashboard", label: "홈" },
    { href: "/attendance", label: "출석" },
    { href: "/meetings", label: "리더모임" },
    { href: familyReportHref, label: "돌봄카드" },
    { href: "/surveys", label: "참여조사" },
    { href: "/announcements", label: "공지" },
    { href: SORTING_HAT_USER_PATH, label: "배정모자" },
  ];
  if (manages) {
    items.push(
      { href: "/groups", label: "가족" },
      { href: "/admin/members", label: "성도 명단" },
      { href: "/admin/handover", label: "가장·임원 관리" },
      { href: "/admin/poll-day", label: "투표일" },
      { href: SORTING_HAT_ADMIN_PATH, label: "배정 관리" },
    );
  }
  return items;
}

function LogoutButton({ className }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      className={className}
    >
      <button
        type="submit"
        className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-stone-100"
      >
        로그아웃
      </button>
    </form>
  );
}

export function AppShell({
  children,
  user,
  familyReportHref,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role; officerTitle: OfficerTitle | null };
  familyReportHref: string;
}) {
  const nav = navFor(user, familyReportHref);

  return (
    <div className="flex h-full min-h-screen flex-col bg-background text-foreground lg:flex-row">
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <div className="border-b border-border px-5 py-4">
          <Link
            href="/dashboard"
            className="block cursor-pointer rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-stone-100"
          >
            <p className="text-lg font-semibold text-foreground">2청년회</p>
            <p className="mt-0.5 text-xs text-muted">통합 플랫폼</p>
          </Link>
        </div>
        <LeaderAxisChrome leaderNav={<AppNav items={nav} variant="desktop" />} />
        <div className="space-y-0.5 border-t border-border px-3 py-3">
          <PlatformTrainingLink />
          <PlatformTongdokLink />
        </div>
        <div className="mt-auto border-t border-border px-3 py-4">
          <p className="truncate px-3 text-sm font-medium">{user.name}</p>
          <LogoutButton className="mt-2" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border bg-surface lg:hidden">
          <div className="flex flex-nowrap items-center gap-2 px-3 py-2 sm:px-4">
            <Link
              href="/dashboard"
              className="min-w-0 flex-1 cursor-pointer rounded-lg px-1 transition-colors hover:bg-stone-100"
            >
              <FitText text="2청년회" />
            </Link>
            <p className="min-w-0 max-w-[28%] shrink truncate text-sm font-medium sm:max-w-[36%]">
              {user.name}
            </p>
            <LeaderAxisChrome
              leaderNav={<AppNavDrawer items={nav} footer={<LogoutButton />} />}
            />
          </div>
        </header>
        <AppMain>{children}</AppMain>
      </div>
    </div>
  );
}
