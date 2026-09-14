"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  error?: string;
  belowAction?: ReactNode;
  shakeKey?: number;
};

export function PasswordField({
  id,
  label,
  error,
  belowAction,
  shakeKey = 0,
  className,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="block">
      <label className="block" htmlFor={id}>
        <span className="sr-only">{label}</span>
        <span
          key={shakeKey}
          className={error ? "auth-field-shake relative block" : "relative block"}
        >
          <LockKeyhole
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            {...props}
            id={id}
            type={visible ? "text" : "password"}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`min-h-14 w-full rounded-full border bg-card pl-13 pr-13 text-base shadow-card outline-none transition focus:ring-4 focus:ring-primary/15 ${error ? "border-destructive focus:border-destructive" : "border-border/80 focus:border-primary"} ${className ?? ""}`}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            disabled={props.disabled}
            aria-label={visible ? `隐藏${label}` : `显示${label}`}
            aria-pressed={visible}
            className="absolute inset-y-0 right-1 flex min-w-12 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
          >
            {visible ? <EyeOff className="size-[1.125rem]" /> : <Eye className="size-[1.125rem]" />}
          </button>
        </span>
      </label>
      <div className="h-6 overflow-hidden px-1 pt-1.5">
        {error && (
          <span
            id={errorId}
            role="alert"
            className="block text-caption font-semibold text-destructive"
          >
            {error}
          </span>
        )}
      </div>
      {belowAction && <div className="flex justify-end">{belowAction}</div>}
    </div>
  );
}
