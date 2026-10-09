import { Check, CircleAlert } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill border-2 font-bold leading-none transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:border-transparent disabled:bg-sunken disabled:text-muted";

const sizes = {
  md: "min-h-12 px-5 text-base",
  sm: "min-h-9 px-4 text-sm",
} as const;

// one primary (petrol) button per view; risky actions are outlined in the error color, never filled
const variants = {
  primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary-press",
  secondary: "border-control bg-card text-primary-ink hover:bg-primary-soft hover:text-on-primary-soft",
  danger: "border-danger bg-card text-danger hover:bg-danger-soft",
  ghost: "border-transparent text-primary-ink hover:bg-primary-soft hover:text-on-primary-soft",
} as const;

export function buttonClass(variant: keyof typeof variants = "primary", extra = "", size: keyof typeof sizes = "md") {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`.trim();
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return <button {...props} className={buttonClass(variant, className, size)} />;
}

export const inputClass =
  "h-13 w-full rounded-field border-2 border-control bg-card px-4 text-lg placeholder:text-muted hover:border-primary";

export const textareaClass =
  "w-full rounded-field border-2 border-control bg-card p-4 text-lg placeholder:text-muted hover:border-primary";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-border bg-card p-6 ${className}`.trim()}>{children}</div>;
}

export function PageTitle({ title, subtitle, size = "lg", action }: { title: string; subtitle?: ReactNode; size?: "lg" | "md"; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className={size === "lg" ? "display-lg" : "display-md"}>{title}</h1>
        {subtitle ? <div className="small mt-2 text-muted">{subtitle}</div> : null}
      </div>
      {action}
    </header>
  );
}

/** Result of a form action: always icon and words, never color alone. */
export function FormMessage({ state }: { state: { ok?: boolean; message?: string } | undefined | null }) {
  if (!state?.message) return null;
  const Icon = state.ok ? Check : CircleAlert;
  return (
    <p role="status" className={`flex gap-3 rounded-field p-4 text-base ${state.ok ? "bg-success-soft text-on-success-soft" : "bg-danger-soft text-on-danger-soft"}`}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
      <span className="min-w-0 break-words">{state.message}</span>
    </p>
  );
}
