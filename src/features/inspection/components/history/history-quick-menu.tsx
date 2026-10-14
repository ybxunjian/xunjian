import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls, useIsPresent } from "framer-motion";
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

const MENU_EASE = [0.22, 1, 0.36, 1] as const;
const MENU_FADE_EASE = [0.25, 0.1, 0.25, 1] as const;
const CLOSED_ACTIONS_TRANSFORM = "translateX(24px) scale(0.86)";
const OPEN_ACTIONS_TRANSFORM = "translateX(0px) scale(1)";

function getActionsTransition(reduceMotion: boolean, visible: boolean) {
  return reduceMotion ? { duration: 0 } : {
    duration: 0.24,
    ease: MENU_EASE,
    // Keep the softer cloud entrance and the original, faster-clearing exit curve.
    opacity: { duration: visible ? 0.2 : 0.24, ease: visible ? MENU_FADE_EASE : MENU_EASE },
  };
}

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
    opacity: 0,
    transition: { duration: reduceMotion ? 0 : 0.34, ease: MENU_EASE },
  };
  const shapeAnimation = useAnimationControls();
  const actionsAnimation = useAnimationControls();
  const initialShape = useRef(paths.join("|"));
  const hasChangedShape = useRef(false);
  const previousPresence = useRef(isPresent);
  const centerVisible = showBack || (!open && !manageHistory);
  const actionsVisible = open && !manageHistory && !showBack && isPresent;

  useLayoutEffect(() => {
    // Repeated Strict Mode setup must not turn the first appearance into a morph.
    if (paths.join("|") !== initialShape.current) hasChangedShape.current = true;
    const reentering = !previousPresence.current;
    const entering = !hasChangedShape.current || reentering;
    previousPresence.current = isPresent;
    if (!isPresent) return;
    if (reentering) {
      shapeAnimation.set({ d: "M 14 14 L 14 14", opacity: 0, pathLength: 1 });
    }
    const duration = entering ? 0.34 : 0.3;
    // Start both parts after the same commit, retaining the group's current pose on reversal.
    void actionsAnimation.start({
      opacity: Number(actionsVisible),
      transform: actionsVisible || reduceMotion ? OPEN_ACTIONS_TRANSFORM : CLOSED_ACTIONS_TRANSFORM,
      transition: getActionsTransition(reduceMotion, actionsVisible),
    });
    void shapeAnimation.start((index: number) => ({
      d: paths[index],
      opacity: index === 2 ? Number(centerVisible) : 1,
      ...(index === 2 ? { pathLength: Number(centerVisible) } : {}),
      transition: {
        duration: reduceMotion ? 0 : duration,
        ease: MENU_EASE,
        ...(index === 2 ? {
          pathLength: { duration: reduceMotion ? 0 : 0.2, delay: showBack && !reduceMotion ? 0.08 : 0 },
          opacity: { duration: reduceMotion ? 0 : centerVisible ? 0.2 : 0.12, delay: showBack && !reduceMotion ? 0.08 : 0 },
        } : {}),
      },
    }));
  }, [actionsAnimation, actionsVisible, centerVisible, isPresent, paths, reduceMotion, shapeAnimation, showBack]);

  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || manageHistory || showBack || !isPresent) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      // A transition action owns the final state and its existing animation.
      // Do not start a separate menu-close animation before that action runs.
      if (event.target instanceof Element && event.target.closest("[data-history-menu-transition]")) return;
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
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
      <motion.div
        id="history-quick-menu-actions"
        role="group"
        aria-label="历史记录管理"
        inert={!actionsVisible}
        aria-hidden={!actionsVisible || undefined}
        className="absolute right-full mr-1 flex items-center gap-1 sm:gap-2"
        // Isolate internal layout without clipping the button focus rings.
        style={{ contain: "layout" }}
        initial={{ opacity: 0, transform: reduceMotion ? OPEN_ACTIONS_TRANSFORM : CLOSED_ACTIONS_TRANSFORM }}
        animate={actionsAnimation}
        exit={{ opacity: 0, transform: reduceMotion ? OPEN_ACTIONS_TRANSFORM : CLOSED_ACTIONS_TRANSFORM }}
        transition={getActionsTransition(reduceMotion, actionsVisible)}
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
        className="relative text-foreground-strong hover:bg-transparent active:scale-[.92]"
      >
        {/* Bound SVG repaint to its fixed icon box; the outer button keeps its focus ring. */}
        <span className="inline-flex size-7 shrink-0" style={{ contain: "layout paint" }} aria-hidden="true">
          <svg viewBox="0 0 28 28" className="size-full" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <motion.path
                key={index}
                custom={index}
                initial={{ d: "M 14 14 L 14 14", opacity: 0 }}
                animate={shapeAnimation}
                exit={collapseLines}
              />
            ))}
          </svg>
        </span>
      </Button>
    </div>
  );
}
