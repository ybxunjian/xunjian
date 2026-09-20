import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  shakeKey?: number;
  trailingAction?: ReactNode;
  belowAction?: ReactNode;
};

/** Shared credential input, error spacing, accessibility and shake animation. */
export function TextField({
  id, label, icon, error, shakeKey = 0, trailingAction, belowAction,
  className, "aria-describedby": describedBy, ...props
}: TextFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="block">
      <label className="sr-only" htmlFor={id}>{label}</label>
      <span key={shakeKey} className={cn("relative block", error && "field-shake")}>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">{icon}</span>
        <input
          {...props} id={id} aria-invalid={Boolean(error)}
          aria-describedby={[describedBy, errorId].filter(Boolean).join(" ") || undefined}
          className={cn(
            "min-h-14 w-full rounded-full border bg-card pl-13 text-base shadow-card outline-none transition focus:ring-4 focus:ring-primary/15 disabled:opacity-45",
            trailingAction ? "pr-13" : "pr-4",
            error ? "border-destructive focus:border-destructive" : "border-border/80 focus:border-primary",
            className,
          )}
        />
        {trailingAction}
      </span>
      <div className={belowAction ? "flex min-h-11 items-start justify-between gap-3 px-1" : "h-6 overflow-hidden px-1 pt-1.5"}>
        {(error || belowAction) && (
          <span id={errorId} role={error ? "alert" : undefined} className={cn("block text-caption font-semibold text-destructive", belowAction && "pt-1.5")}>
            {error}
          </span>
        )}
        {belowAction}
      </div>
    </div>
  );
}
