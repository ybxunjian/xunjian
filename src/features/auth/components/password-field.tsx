"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { TextField } from "@/components/ui/text-field";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  id: string;
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
  return (
    <TextField
      {...props} id={id} label={label} error={error} shakeKey={shakeKey}
      belowAction={belowAction} className={className}
      type={visible ? "text" : "password"}
      icon={<LockKeyhole className="size-5" />}
      trailingAction={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={props.disabled}
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 z-10 flex min-w-12 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          {visible ? <EyeOff className="size-[1.125rem]" /> : <Eye className="size-[1.125rem]" />}
        </button>
      }
    />
  );
}
