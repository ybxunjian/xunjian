"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { Button } from "./button";

type ConfirmationPopoverProps = {
  id: string;
  open: boolean;
  busy: boolean;
  title: string;
  confirmLabel: string;
  busyLabel?: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
};

/** Anchored, non-modal confirmation inside the owning page or sheet. */
export function ConfirmationPopover(props: ConfirmationPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { open, busy, onClose } = props;

  useEffect(() => {
    if (!open || busy) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onClose();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Handle the bubble before the parent Sheet's document capture listener.
      event.preventDefault();
      event.stopPropagation();
      onClose();
      rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open, busy, onClose]);

  return (
    <div ref={rootRef} className="relative mx-auto mt-2 w-fit">
      {props.children}
      <AnimatePresence>
        {props.open && <ConfirmationBubble key={props.id} {...props} />}
      </AnimatePresence>
    </div>
  );
}

function ConfirmationBubble({ id, busy, title, confirmLabel, busyLabel = "正在处理…", onClose, onConfirm }: ConfirmationPopoverProps) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.div
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
      aria-hidden={!isPresent || undefined}
      inert={!isPresent}
      className="absolute left-1/2 top-full z-30 mt-2 w-48 rounded-confirmation-popover border border-border bg-card p-2 shadow-floating"
      style={{ x: "-50%" }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      transition={{ duration: reduceMotion ? 0 : 0.16 }}
    >
      <span aria-hidden="true" className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-card" />
      <h3 id={`${id}-title`} className="sr-only">{title}</h3>
      <div className="relative flex flex-col gap-2">
        <Button type="button" variant="destructive" disabled={busy || !isPresent} onClick={onConfirm} className="w-full rounded-full shadow-none">
          {busy ? busyLabel : confirmLabel}
        </Button>
        <Button ref={cancelRef} type="button" variant="ghost" disabled={busy || !isPresent} onClick={onClose} className="w-full rounded-full bg-muted">
          取消
        </Button>
      </div>
    </motion.div>
  );
}
