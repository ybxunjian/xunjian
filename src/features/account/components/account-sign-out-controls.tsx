"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const MotionButton = motion.create(Button);
const SPLIT_WIDTH = "calc(50% - 0.25rem)";
// A small overshoot in the split distance, followed by settling at the target.
const OVERSHOOT_WIDTH = "calc(49.1% - 0.2545rem)";

export function AccountSignOutControls({
  open, busy, onRequest, onCancel, onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const [settledOpen, setSettledOpen] = useState(open);
  const [animating, setAnimating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const ready = reduceMotion || (!animating && settledOpen === open);
  const disabled = busy || !isPresent || !ready;
  const transition = {
    duration: reduceMotion ? 0 : open ? 0.39 : 0.28,
    ease: open ? [0.22, 0.72, 0.2, 1] as const : [0.42, 0, 0.72, 0.35] as const,
  };
  const splitTransition = {
    ...transition,
    times: open ? [0, 0.88, 1] : undefined,
  };

  useEffect(() => {
    if (!open || busy || !isPresent) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) onCancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open, busy, isPresent, onCancel]);

  useEffect(() => {
    if (!ready || busy || !isPresent) return;
    if (open) cancelRef.current?.focus({ preventScroll: true });
    else if (wasOpenRef.current) confirmRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = open;
  }, [open, ready, busy, isPresent]);

  return (
    <div ref={rootRef} className="relative mt-5 h-11 w-full" role="group" aria-label={open ? "确认退出登录" : "退出登录"} aria-busy={busy}>
      <MotionButton
        ref={cancelRef}
        type="button"
        variant="ghost"
        initial={false}
        animate={{
          x: open ? reduceMotion ? "0%" : [null, "-0.9%", "0%"] : "50%",
          opacity: open ? 1 : 0,
        }}
        transition={{ x: splitTransition, opacity: transition }}
        disabled={disabled || !open}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={onCancel}
        className={`absolute left-0 top-0 h-11 w-[calc(50%_-_0.25rem)] bg-muted transition-colors active:scale-[.99] ${busy ? "" : "disabled:opacity-100"}`}
      >
        取消
      </MotionButton>
      <MotionButton
        ref={confirmRef}
        type="button"
        variant="destructive"
        initial={false}
        animate={{ width: open ? reduceMotion ? SPLIT_WIDTH : [null, OVERSHOOT_WIDTH, SPLIT_WIDTH] : "calc(100% - 0rem)" }}
        transition={splitTransition}
        onAnimationStart={() => setAnimating(true)}
        onAnimationComplete={() => { setSettledOpen(open); setAnimating(false); }}
        disabled={disabled}
        aria-label={busy ? "正在退出…" : open ? "确认退出" : "退出登录"}
        onClick={() => { if (!disabled) (open ? onConfirm : onRequest)(); }}
        className={`absolute right-0 top-0 h-11 overflow-hidden transition-colors active:scale-[.99] disabled:shadow-destructive! ${busy ? "" : "disabled:opacity-100"}`}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={busy ? "busy" : open ? "confirm" : "request"}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={transition}
            className="absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {!open && <LogOut className="size-4" />}
            {busy ? "正在退出…" : open ? "确认退出" : "退出登录"}
          </motion.span>
        </AnimatePresence>
      </MotionButton>
    </div>
  );
}
