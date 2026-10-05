"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPLIT_WIDTH = "calc(50% - 0.25rem)";
const JOINED_WIDTH = "calc(50% - 0rem)";
// Capsule radius is half the h-11 (2.75rem) button height.
const CAPSULE_RADIUS = "1.375rem";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
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
    else if (wasOpenRef.current) triggerRef.current?.focus({ preventScroll: true });
    wasOpenRef.current = open;
  }, [open, busy, isPresent]);

  return (
    <div ref={rootRef} className="relative mt-5 h-11 w-full" role="group" aria-label={open ? "确认退出登录" : "退出登录"} aria-busy={busy}>
      <motion.div
        className="absolute left-0 top-0 h-11"
        style={{ borderTopLeftRadius: CAPSULE_RADIUS, borderBottomLeftRadius: CAPSULE_RADIUS }}
        initial={false}
        animate={{ width: open ? SPLIT_WIDTH : JOINED_WIDTH,
          borderTopRightRadius: open ? CAPSULE_RADIUS : "0rem",
          borderBottomRightRadius: open ? CAPSULE_RADIUS : "0rem",
          backgroundColor: open ? "var(--muted)" : "var(--destructive)" }}
        transition={transition}
      >
        <Button ref={cancelRef} type="button" variant="ghost"
          style={{ borderRadius: "inherit" }}
          disabled={disabled || !open} aria-hidden={!open} tabIndex={open ? 0 : -1}
          onClick={onCancel}
          className={`h-11 w-full rounded-[inherit] bg-transparent p-0 hover:bg-transparent active:scale-[.99] ${busy ? "" : "disabled:opacity-100"}`}>
          <motion.span initial={false} animate={{ opacity: open ? 1 : 0 }} transition={textTransition}>取消</motion.span>
        </Button>
      </motion.div>
      <motion.div
        className="absolute right-0 top-0 h-11 bg-destructive"
        style={{ borderTopRightRadius: CAPSULE_RADIUS, borderBottomRightRadius: CAPSULE_RADIUS }}
        initial={false}
        animate={{ width: open ? SPLIT_WIDTH : JOINED_WIDTH,
          borderTopLeftRadius: open ? CAPSULE_RADIUS : "0rem",
          borderBottomLeftRadius: open ? CAPSULE_RADIUS : "0rem" }}
        transition={transition}
      >
        <Button type="button" variant="destructive"
          style={{ borderRadius: "inherit" }}
          disabled={disabled || !open} aria-hidden={!open} tabIndex={open ? 0 : -1}
          aria-label={busy ? "正在退出…" : "确认退出"}
          onClick={() => { if (!disabled && open) onConfirm(); }}
          className={`relative h-11 w-full rounded-[inherit] p-0 shadow-none! disabled:shadow-none! active:scale-[.99] ${busy ? "" : "disabled:opacity-100"}`}>
          <AnimatePresence initial={false}>
            <motion.span key={busy ? "busy" : "confirm"}
              initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} exit={{ opacity: 0 }}
              transition={textTransition} className="absolute inset-0 flex items-center justify-center whitespace-nowrap">
              {busy ? "正在退出…" : "确认退出"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>
      <Button ref={triggerRef} type="button" variant="ghost"
        disabled={disabled || open} aria-hidden={open} tabIndex={open ? -1 : 0}
        aria-label="退出登录" onClick={onRequest}
        className={`absolute inset-0 h-11 w-full rounded-full bg-transparent text-destructive-foreground hover:bg-transparent active:scale-[.99] ${open ? "pointer-events-none" : "disabled:opacity-100"}`}>
        <motion.span initial={false} animate={{ opacity: open ? 0 : 1 }} transition={textTransition}
          className="flex items-center justify-center gap-2">
          <LogOut className="size-4" />退出登录
        </motion.span>
      </Button>
    </div>
  );
}
