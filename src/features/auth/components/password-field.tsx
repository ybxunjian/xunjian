"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

type TextSelection = {
  start: number;
  end: number;
  direction: "forward" | "backward" | "none" | undefined;
};

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
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<TextSelection | null>(null);
  const errorId = error && id ? `${id}-error` : undefined;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const selection = selectionRef.current;
    selectionRef.current = null;

    if (
      !input ||
      !selection ||
      input.ownerDocument.activeElement !== input
    ) {
      return;
    }

    input.setSelectionRange(
      selection.start,
      selection.end,
      selection.direction,
    );
  }, [visible]);

  function preserveActiveInput(event: ReactPointerEvent<HTMLButtonElement>) {
    // A pointer press normally focuses the button before click. Cancelling that
    // default action keeps the input active and prevents an iOS keyboard close.
    event.preventDefault();
  }

  function toggleVisibility() {
    const input = inputRef.current;

    selectionRef.current =
      input &&
      input.ownerDocument.activeElement === input &&
      input.selectionStart !== null &&
      input.selectionEnd !== null
        ? {
            start: input.selectionStart,
            end: input.selectionEnd,
            direction: input.selectionDirection ?? undefined,
          }
        : null;

    setVisible((current) => !current);
  }

  return (
    <div className="block">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
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
          ref={inputRef}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={`min-h-14 w-full rounded-full border bg-card pl-13 pr-13 text-base shadow-card outline-none transition focus:ring-4 focus:ring-primary/15 ${error ? "border-destructive focus:border-destructive" : "border-border/80 focus:border-primary"} ${className ?? ""}`}
        />
        <button
          type="button"
          onPointerDown={preserveActiveInput}
          onClick={toggleVisibility}
          disabled={props.disabled}
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 z-10 flex min-w-12 touch-manipulation select-none items-center justify-center rounded-full text-muted-foreground [-webkit-tap-highlight-color:transparent] disabled:pointer-events-none disabled:opacity-45"
        >
          {visible ? (
            <EyeOff className="size-[1.125rem]" />
          ) : (
            <Eye className="size-[1.125rem]" />
          )}
        </button>
      </span>
      {belowAction ? (
        <div className="flex min-h-11 items-start justify-between gap-3 px-1">
          <span
            id={errorId}
            role={error ? "alert" : undefined}
            className="pt-1.5 text-caption font-semibold text-destructive"
          >
            {error}
          </span>
          {belowAction}
        </div>
      ) : (
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
      )}
    </div>
  );
}
