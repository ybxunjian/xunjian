"use client";

import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
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
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const errorId = error && id ? `${id}-error` : undefined;

  useEffect(() => {
    if (
      !error ||
      !shakeKey ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const animation = wrapperRef.current?.animate(
      [0, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 360, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [error, shakeKey]);

  function preserveActiveInput(event: ReactPointerEvent<HTMLButtonElement>) {
    // Cancel the pointer's focus transfer before it can blur the input. The
    // subsequent click still toggles visibility, and keyboard clicks are
    // unaffected because they do not start with pointerdown.
    event.preventDefault();
  }

  function toggleVisibility() {
    if (props.disabled) return;
    setVisible((current) => !current);
  }

  return (
    <div className="block">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <span ref={wrapperRef} className="relative block">
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
          onPointerDown={preserveActiveInput}
          onClick={toggleVisibility}
          disabled={props.disabled}
          aria-label={visible ? `隐藏${label}` : `显示${label}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 z-10 flex min-w-12 touch-manipulation select-none items-center justify-center rounded-full text-muted-foreground outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-45"
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
