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

const cardPaddingClass = {
  none: "",
  /** 기본 섹션 카드 */
  md: "p-4 sm:p-5",
  /** 빈 상태·안내 카드 */
  lg: "p-6",
  /** 로그인 등 단독 폼 카드 */
  xl: "p-6 sm:p-8",
} as const;

const cardToneClass = {
  default: "",
  /** 마감·읽기 전용 안내 */
  muted: "bg-background text-sm text-stone-600",
  /** 처리 결과 등 성공 안내 */
  success: "border-success/20 bg-success-muted text-sm text-success",
  /** 담당 없음 등 빈 상태 */
  empty: "text-center text-stone-600",
} as const;

/**
 * 셸 공통 카드. 외형은 prop 으로만 바꾼다 (design lint: call-site className 은 레이아웃만).
 * - padding: 내부 여백 프리셋
 * - tone: 배경/텍스트 톤
 * - interactive: 링크 카드 hover 피드백
 * - bleed: 모바일에서 좌우 테두리·라운드 없이 화면 폭을 채움 (sm 이상은 일반 카드)
 */
export function Card({
  children,
  className = "",
  padding = "none",
  tone = "default",
  interactive = false,
  bleed = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: keyof typeof cardPaddingClass;
  tone?: keyof typeof cardToneClass;
  interactive?: boolean;
  bleed?: boolean;
}) {
  return (
    <ShadcnCard
      className={cn(
        "gap-0 rounded-2xl border border-border bg-surface py-0 shadow-sm ring-0",
        cardPaddingClass[padding],
        cardToneClass[tone],
        interactive && "transition hover:border-input hover:bg-background",
        bleed &&
          "rounded-none border-x-0 shadow-none sm:rounded-xl sm:border-x sm:shadow-sm",
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

const buttonSizeClass = {
  default: "px-4",
  /** 목록 행 안의 보조 액션 (높이는 유지, 글자·좌우 여백만 축소) */
  sm: "px-3 text-xs",
} as const;

export function Button({
  className = "",
  variant = "primary",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariantMap;
  size?: keyof typeof buttonSizeClass;
}) {
  return (
    <ShadcnButton
      variant={buttonVariantMap[variant]}
      size="lg"
      className={cn(buttonSizeClass[size], className)}
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
  neutral: "border-transparent bg-muted text-stone-700",
  green: "border-transparent bg-success-muted text-success",
  blue: "border-transparent bg-info-muted text-info",
  accent: "border-transparent bg-accent/15 text-accent",
} as const;

const badgeShapeClass = {
  pill: "rounded-full font-medium",
  /** 배너 안 라벨 등 각진 강조 태그 */
  tag: "rounded-md font-semibold",
} as const;

export function Badge({
  children,
  tone = "neutral",
  shape = "pill",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeToneClass;
  shape?: keyof typeof badgeShapeClass;
  className?: string;
}) {
  return (
    <ShadcnBadge
      variant="secondary"
      className={cn(badgeShapeClass[shape], badgeToneClass[tone], className)}
    >
      {children}
    </ShadcnBadge>
  );
}

const noticeToneClass = {
  destructive: "border-destructive/20 bg-destructive/5 text-destructive",
  success: "border-success/20 bg-success-muted text-success",
} as const;

/** 폼 오류·처리 결과 안내 박스. 위치(margin)만 className 으로 조정한다. */
export function Notice({
  children,
  tone = "destructive",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof noticeToneClass;
  className?: string;
}) {
  return (
    <p
      role={tone === "destructive" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        noticeToneClass[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
