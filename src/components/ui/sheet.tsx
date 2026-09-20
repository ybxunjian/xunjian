"use client";

import type { ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SheetProps = {
  children: ReactNode;
  overlays?: ReactNode;
  labelledBy: string;
  onClose: () => void;
  busy?: boolean;
  nested?: boolean;
  role?: "dialog" | "alertdialog";
  size?: "default" | "compact" | "credential";
  layoutScroll?: boolean;
};

/** Shared bottom-sheet shell. Keep nested overlays outside the scrolling panel. */
export function Sheet({
  children, overlays, labelledBy, onClose, busy = false, nested = false,
  role = "dialog", size = "default", layoutScroll = false,
}: SheetProps) {
  const isPresent = useIsPresent();
  const reduceMotion = useReducedMotion();
  const offset = nested ? 20 : 40;
  return (
    <motion.div
      className={cn(
        "fixed inset-0 flex items-end justify-center px-page pb-[max(1rem,env(safe-area-inset-bottom))]",
        nested ? "z-[60] bg-overlay/35" : "z-50 bg-overlay backdrop-blur-[2px]",
      )}
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (isPresent && !busy) onClose();
      }}
    >
      <motion.div
        layoutScroll={layoutScroll}
        role={role} aria-modal="true" aria-labelledby={labelledBy}
        aria-hidden={!isPresent} inert={!isPresent}
        className={cn(
          "max-h-[calc(100svh-2rem)] w-full overflow-y-auto overscroll-contain rounded-sheet border border-border/80 bg-card p-4 text-card-foreground shadow-floating",
          size === "compact" ? "max-w-sm" : size === "credential" ? "max-w-[var(--auth-content-max-width)]" : "max-w-md",
        )}
        initial={{ y: reduceMotion ? 0 : offset, opacity: nested ? 0.8 : 0, scale: nested && !reduceMotion ? 0.98 : 1 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: reduceMotion ? 0 : offset, opacity: 0, scale: nested && !reduceMotion ? 0.98 : 1 }}
        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: nested ? 460 : 420, damping: 34 }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </motion.div>
      {overlays}
    </motion.div>
  );
}
