import Link from "next/link";
import type { ReactNode } from "react";
import type { HomeCard } from "@/lib/platform/home-cards";
import { TRAINING_SSO_ENTRY_PATH } from "@/lib/platform/training-sso-constants";
import { Badge, Card, CardHeader } from "@/components/ui";

function CardHrefLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (href === TRAINING_SSO_ENTRY_PATH) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  );
}

function HomeCardLink({ card }: { card: HomeCard }) {
  if (card.variant === "emphasis") {
    return (
      <CardHrefLink
        href={card.href}
        className="flex flex-col justify-between rounded-2xl border-2 border-primary bg-surface px-5 py-6 shadow-sm transition hover:border-primary/80 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-primary">{card.title}</h3>
            {card.badge && <Badge tone="accent">{card.badge}</Badge>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{card.description}</p>
        </div>
        <span className="mt-4 text-sm font-medium text-primary">바로 가기 →</span>
      </CardHrefLink>
    );
  }

  return (
    <CardHrefLink
      href={card.href}
      className="block rounded-2xl transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Card>
        <CardHeader title={card.title} subtitle={card.description} />
        {card.badge && (
          <div className="flex items-center px-4 py-3 sm:px-5">
            <Badge tone="accent">{card.badge}</Badge>
          </div>
        )}
      </Card>
    </CardHrefLink>
  );
}

export function HomeCardGrid({ cards }: { cards: HomeCard[] }) {
  const emphasis = cards.filter((c) => c.variant === "emphasis");
  const rest = cards.filter((c) => c.variant !== "emphasis");

  return (
    <div className="space-y-4">
      {emphasis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1">
          {emphasis.map((card) => (
            <HomeCardLink key={card.id} card={card} />
          ))}
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rest.map((card) => (
            <HomeCardLink key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
