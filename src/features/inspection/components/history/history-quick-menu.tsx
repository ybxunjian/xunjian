import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useIsPresent } from "framer-motion";
import { ArchiveRestore, CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HistoryQuickMenuProps = {
  recordCount: number;
  reduceMotion: boolean;
  manageHistory: boolean;
  showBack: boolean;
  onCalendar: () => void;
  onBatchDelete: () => void;
  onBackup: () => void;
  onDone: () => void;
  onBack: () => void;
};

type StrokeTarget = { index: number; channel: "geometry" | "opacity" };

export function HistoryQuickMenu({
  recordCount, reduceMotion, manageHistory, showBack, onCalendar, onBatchDelete, onBackup, onDone, onBack,
}: HistoryQuickMenuProps) {
  const isPresent = useIsPresent();
  const [open, setOpen] = useState(false);
  const [previousRenderPresence, setPreviousRenderPresence] = useState(isPresent);
  if (previousRenderPresence !== isPresent) {
    // A retained exit must not restore the expanded menu on a quick return.
    setPreviousRenderPresence(isPresent);
    setOpen(false);
  }
  const paths = useMemo(() => [
    showBack ? "M 4 14 L 14 24" : manageHistory ? "M 3 14 L 11 21" : open ? "M 4 4 L 24 24" : "M 2 4 L 26 4",
    showBack ? "M 14 4 L 4 14" : manageHistory ? "M 11 21 L 25 5" : open ? "M 24 4 L 4 24" : "M 2 24 L 26 24",
    showBack ? "M 4 14 L 26 14" : "M 2 14 L 26 14",
  ], [showBack, manageHistory, open]);
  const collapseLines = {
    d: "M 14 14 L 14 14",
    transition: { duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] as const },
  };
  const fadeLines = {
    opacity: 0,
    transition: collapseLines.transition,
  };
  const shapeAnimation = useAnimationControls();
  const initialShape = useRef(paths.join("|"));
  const hasChangedShape = useRef(false);
  const previousPresence = useRef(isPresent);
  const centerVisible = showBack || (!open && !manageHistory);

  useEffect(() => {
    // Repeated Strict Mode setup must not turn the first appearance into a morph.
    if (paths.join("|") !== initialShape.current) hasChangedShape.current = true;
    const reentering = !previousPresence.current;
    const entering = !hasChangedShape.current || reentering;
    previousPresence.current = isPresent;
    if (!isPresent) return;
    if (reentering) {
      shapeAnimation.set(({ index, channel }: StrokeTarget) => channel === "opacity"
        ? { opacity: 0 }
        : { d: "M 14 14 L 14 14", ...(index === 2 ? { strokeDasharray: "1 1" } : {}) });
    }
    const duration = entering ? 0.34 : 0.3;
    void shapeAnimation.start(({ index, channel }: StrokeTarget) => ({
      ...(channel === "opacity"
        ? { opacity: index === 2 ? Number(centerVisible) : 1 }
        : { d: paths[index], ...(index === 2 ? { strokeDasharray: `${Number(centerVisible)} 1` } : {}) }),
      transition: {
        duration: reduceMotion ? 0 : duration,
        ease: [0.22, 1, 0.36, 1],
        ...(index === 2 ? {
          strokeDasharray: { duration: reduceMotion ? 0 : 0.2, delay: showBack && !reduceMotion ? 0.08 : 0 },
          opacity: { duration: reduceMotion ? 0 : 0.2, delay: showBack && !reduceMotion ? 0.08 : 0 },
        } : {}),
      },
    }));
  }, [centerVisible, isPresent, paths, reduceMotion, shapeAnimation, showBack]);

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || manageHistory || showBack || !isPresent) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const menu = menuRef.current;
      if (!menu) return;
      // Use the same completed click as the toggle. Touch hit adjustment can
      // resolve pointerdown and click to different targets near a button edge.
      const path = event.composedPath();
      if (path.includes(menu)) return;
      // A transition action owns the final state and its existing animation.
      // Do not start a separate menu-close animation before that action runs.
      if (path.some((node) => node instanceof Element && node.hasAttribute("data-history-menu-transition"))) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("click", closeOnOutsideClick, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, manageHistory, showBack, isPresent]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    // SVG path morphs must not become scroll anchors near the viewport edge.
    <div ref={menuRef} style={{ overflowAnchor: "none" }} className="relative z-10 flex shrink-0 items-center" inert={!isPresent} aria-hidden={!isPresent || undefined}>
      <AnimatePresence>
        {open && !manageHistory && !showBack && isPresent && (
          <motion.div
            id="history-quick-menu-actions"
            role="group"
            aria-label="历史记录管理"
            className="absolute right-full mr-1 flex items-center gap-1 sm:gap-2"
            // Keep icon size and spacing fixed while the group moves and fades
            // on one timeline. A complete transform retains the native path.
            initial={{ opacity: 0, transform: reduceMotion ? "translateX(0px)" : "translateX(8px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{
              opacity: 0,
              transform: reduceMotion ? "translateX(0px)" : "translateX(8px)",
              transition: reduceMotion ? { duration: 0 } : {
                duration: 0.18,
                ease: [0.4, 0, 1, 1],
              },
            }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {[
              { label: "巡检日历", icon: <CalendarDays size={21} />, action: () => choose(onCalendar), disabled: false },
              { label: "备份与恢复", icon: <ArchiveRestore size={21} />, action: () => choose(onBackup), disabled: false },
              { label: "批量删除", icon: <Trash2 size={21} />, action: onBatchDelete, disabled: recordCount === 0 },
            ].map((item) => (
              <div key={item.label} className="shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={item.label}
                  disabled={item.disabled}
                  onClick={item.action}
                  className="text-foreground-strong hover:bg-transparent active:scale-100"
                >
                  {item.icon}
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        ref={toggleRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={showBack ? "返回历史记录" : manageHistory ? "完成" : open ? "收起管理菜单" : "展开管理菜单"}
        aria-controls={manageHistory || showBack ? undefined : "history-quick-menu-actions"}
        aria-expanded={manageHistory || showBack ? undefined : open}
        onClick={() => {
          if (showBack) {
            setOpen(false);
            onBack();
          } else if (manageHistory) {
            setOpen(false);
            onDone();
          } else {
            setOpen((value) => !value);
          }
        }}
        // The transparent rectangular layer includes the rounded button's
        // corners in its hit target, without changing its focus ring.
        className="group relative text-foreground-strong before:absolute before:inset-0 before:content-[''] hover:bg-transparent active:scale-100"
      >
        <svg viewBox="0 0 28 28" className="pointer-events-none size-7 transition-transform duration-200 group-active:scale-[.92]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            // Keep each stroke's opacity independent (including at intersections).
            // Geometry updates no longer rewrite opacity or static dash attributes.
            // Unitless dash lengths preserve Motion's normalized SVG drawing.
            <motion.g
              key={index}
              custom={{ index, channel: "opacity" } satisfies StrokeTarget}
              initial={{ opacity: 0 }}
              animate={shapeAnimation}
              exit={fadeLines}
            >
              <motion.path
                custom={{ index, channel: "geometry" } satisfies StrokeTarget}
                initial={{ d: "M 14 14 L 14 14", ...(index === 2 ? { strokeDasharray: "1 1" } : {}) }}
                pathLength={index === 2 ? 1 : undefined}
                strokeDashoffset={index === 2 ? 0 : undefined}
                animate={shapeAnimation}
                exit={collapseLines}
              />
            </motion.g>
          ))}
        </svg>
      </Button>
    </div>
  );
}
