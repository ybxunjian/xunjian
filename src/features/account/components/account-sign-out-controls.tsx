"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const MotionButton = motion.create(Button);
const SPLIT_WIDTH = "calc(50% - 0.25rem)";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const disabled = busy || !isPresent;
  const transition = {
    duration: reduceMotion ? 0 : open ? 0.28 : 0.22,
    ease: open ? [0.25, 0.1, 0.25, 1] as const : [0.25, 0.1, 0.35, 1] as const,
  };
  const textTransition = { duration: transition.duration, ease: "easeInOut" as const };

  useEffect(() => {
    if (!open || busy || !isPresent) return;
    let press: { id: number; x: number; y: number; moved: boolean } | null = null;
    const outside = (target: EventTarget | null) =>
      target instanceof Node && !rootRef.current?.contains(target);
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !outside(event.target)) return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    };
    const pointerMove = (event: PointerEvent) => {
      if (press?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press.moved = true;
    };
    const pointerUp = (event: PointerEvent) => {
      if (press?.id !== event.pointerId) return;
      const tappedOutside = !press.moved && outside(event.target) &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8;
      press = null;
      if (tappedOutside) onCancel();
    };
    const clearPress = () => { press = null; };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    };
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointermove", pointerMove, true);
    document.addEventListener("pointerup", pointerUp, true);
    document.addEventListener("pointercancel", clearPress, true);
    document.addEventListener("scroll", clearPress, true);
    window.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("pointermove", pointerMove, true);
      document.removeEventListener("pointerup", pointerUp, true);
      document.removeEventListener("pointercancel", clearPress, true);
      document.removeEventListener("scroll", clearPress, true);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open, busy, isPresent, onCancel]);

  useEffect(() => {
    if (busy || !isPresent) return;
    if (open) cancelRef.current?.focus({ preventScroll: true });
    else if (wasOpenRef.current) confirmRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = open;
  }, [open, busy, isPresent]);

  return (
    <div ref={rootRef} className="relative mt-5 h-11 w-full" role="group" aria-label={open ? "确认退出登录" : "退出登录"} aria-busy={busy}>
      <MotionButton
        ref={cancelRef}
        type="button"
        variant="ghost"
        initial={false}
        animate={{
          x: open ? "0%" : "50%",
          opacity: open ? 1 : 0,
        }}
        transition={transition}
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
        animate={{ width: open ? SPLIT_WIDTH : "calc(100% - 0rem)" }}
        transition={transition}
        disabled={disabled}
        aria-label={busy ? "正在退出…" : open ? "确认退出" : "退出登录"}
        onClick={() => { if (!disabled) (open ? onConfirm : onRequest)(); }}
        className={`absolute right-0 top-0 h-11 overflow-hidden transition-colors active:scale-[.99] disabled:shadow-destructive! ${busy ? "" : "disabled:opacity-100"}`}
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={busy ? "busy" : open ? "confirm" : "request"}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={textTransition}
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
