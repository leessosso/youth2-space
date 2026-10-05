/**
 * App-facing UI primitives backed by shadcn/ui (`src/components/ui/*`).
 * Preserves legacy APIs (Button variants, CardHeader title/subtitle, Badge tone)
 * so shell screens can migrate gradually.
 */
import type { ButtonHTMLAttributes, ComponentProps, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { Button as ShadcnButton } from "@/components/ui/button";
import {
  Card as ShadcnCard,
  CardDescription,
  CardHeader as ShadcnCardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";

const buttonVariantMap = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  danger: "destructive",
} as const;

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ShadcnCard
      className={cn(
        "gap-0 rounded-2xl border border-border bg-surface py-0 shadow-sm ring-0",
        className,
      )}
    >
      {children}
    </ShadcnCard>
  );
}

export function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <ShadcnCardHeader className="border-b border-border px-4 py-3 sm:px-5">
      <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      {subtitle ? (
        <CardDescription className="mt-0.5 text-sm text-muted-foreground">
          {subtitle}
        </CardDescription>
      ) : null}
    </ShadcnCardHeader>
  );
}

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariantMap;
}) {
  return (
    <ShadcnButton
      variant={buttonVariantMap[variant]}
      size="lg"
      className={cn("px-4", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <ShadcnInput
      className={cn("h-9 bg-surface px-3 text-sm", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentProps<typeof ShadcnTextarea>) {
  return (
    <ShadcnTextarea
      rows={4}
      className={cn("bg-surface px-3 text-sm", className)}
      {...props}
    />
  );
}

export function Label({
  children,
  className,
  ...props
}: ComponentProps<typeof ShadcnLabel>) {
  return (
    <ShadcnLabel className={cn("mb-1 text-stone-700", className)} {...props}>
      {children}
    </ShadcnLabel>
  );
}

const badgeToneClass = {
  neutral: "border-transparent bg-stone-100 text-stone-700",
  green: "border-transparent bg-emerald-50 text-emerald-800",
  blue: "border-transparent bg-sky-50 text-sky-800",
  accent: "border-transparent bg-accent/15 text-accent",
} as const;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeToneClass;
  className?: string;
}) {
  return (
    <ShadcnBadge
      variant="secondary"
      className={cn("rounded-full font-medium", badgeToneClass[tone], className)}
    >
      {children}
    </ShadcnBadge>
  );
}
