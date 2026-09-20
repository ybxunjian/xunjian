"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useIsPresent, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

type SheetStackEntry = {
  panel: () => HTMLElement | null;
  present: boolean;
  setTopMost: (topMost: boolean) => void;
};

type BodyLock = {
  count: number;
  scrollY: number;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
};

const sheetStack: SheetStackEntry[] = [];
let bodyLock: BodyLock | null = null;

function getTopSheet() {
  for (let index = sheetStack.length - 1; index >= 0; index -= 1) {
    if (sheetStack[index].present) return sheetStack[index];
  }
  return undefined;
}

function syncSheetStack() {
  const topSheet = getTopSheet();
  sheetStack.forEach((entry) => entry.setTopMost(entry === topSheet));
}

function getFocusableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.closest("[inert]") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

function focusFirstElement(panel: HTMLElement) {
  const focusable = getFocusableElements(panel);
  const preferred = focusable.find((element) =>
    element.matches("[autofocus], [data-autofocus]"),
  );
  (preferred ?? focusable[0] ?? panel).focus({ preventScroll: true });
}

function lockBodyScroll() {
  if (bodyLock) {
    bodyLock.count += 1;
    return;
  }

  const bodyStyle = document.body.style;
  bodyLock = {
    count: 1,
    scrollY: window.scrollY,
    position: bodyStyle.position,
    top: bodyStyle.top,
    left: bodyStyle.left,
    right: bodyStyle.right,
    width: bodyStyle.width,
    overflow: bodyStyle.overflow,
  };
  bodyStyle.position = "fixed";
  bodyStyle.top = `-${bodyLock.scrollY}px`;
  bodyStyle.left = "0";
  bodyStyle.right = "0";
  bodyStyle.width = "100%";
  bodyStyle.overflow = "hidden";
}

function unlockBodyScroll() {
  if (!bodyLock) return;
  bodyLock.count -= 1;
  if (bodyLock.count > 0) return;

  const snapshot = bodyLock;
  bodyLock = null;
  const bodyStyle = document.body.style;
  bodyStyle.position = snapshot.position;
  bodyStyle.top = snapshot.top;
  bodyStyle.left = snapshot.left;
  bodyStyle.right = snapshot.right;
  bodyStyle.width = snapshot.width;
  bodyStyle.overflow = snapshot.overflow;
  window.scrollTo(0, snapshot.scrollY);
}

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
  const panelRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<SheetStackEntry | null>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  const presentRef = useRef(isPresent);
  const [isTopMost, setIsTopMost] = useState(true);
  const offset = nested ? 20 : 40;

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
    presentRef.current = isPresent;
  }, [busy, isPresent, onClose]);

  useEffect(() => {
    const entry: SheetStackEntry = {
      panel: () => panelRef.current,
      present: presentRef.current,
      setTopMost: setIsTopMost,
    };
    entryRef.current = entry;
    sheetStack.push(entry);
    syncSheetStack();
    lockBodyScroll();

    const focusFrame = window.requestAnimationFrame(() => {
      const panel = entry.panel();
      if (panel && getTopSheet() === entry) focusFirstElement(panel);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (getTopSheet() !== entry || !entry.present) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current) closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = entry.panel();
      if (!panel) return;
      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    function onFocusIn(event: FocusEvent) {
      if (getTopSheet() !== entry || !entry.present) return;
      const panel = entry.panel();
      if (panel && event.target instanceof Node && !panel.contains(event.target)) {
        focusFirstElement(panel);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      const entryIndex = sheetStack.indexOf(entry);
      if (entryIndex >= 0) sheetStack.splice(entryIndex, 1);
      entryRef.current = null;
      syncSheetStack();
      unlockBodyScroll();
    };
  }, []);

  useEffect(() => {
    const entry = entryRef.current;
    if (!entry) return;
    if (!isPresent) {
      const panel = entry.panel();
      const activeElement = document.activeElement;
      if (
        panel &&
        activeElement instanceof HTMLElement &&
        panel.contains(activeElement)
      ) {
        activeElement.blur();
      }
    }
    entry.present = isPresent;
    syncSheetStack();
  }, [isPresent]);

  const interactive = isPresent && isTopMost;
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
        ref={panelRef}
        layoutScroll={layoutScroll}
        role={role} aria-modal={interactive ? "true" : undefined}
        aria-labelledby={labelledBy} aria-hidden={!interactive}
        inert={!interactive} tabIndex={-1}
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
