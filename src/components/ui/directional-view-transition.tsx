"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";

export type ViewTransitionDirection = 1 | -1;

export const VIEW_TRANSITION = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

const variants = {
  initial: (direction: ViewTransitionDirection) => ({
    x: direction === 1 ? "100%" : "-25%",
    zIndex: direction === 1 ? 2 : 1,
  }),
  animate: (direction: ViewTransitionDirection) => ({
    x: "0%",
    zIndex: direction === 1 ? 2 : 1,
  }),
  exit: (direction: ViewTransitionDirection) => ({
    x: direction === 1 ? "-25%" : "100%",
    zIndex: direction === 1 ? 1 : 2,
  }),
};

export function DirectionalViewTransition({
  viewKey,
  direction,
  reduceMotion,
  children,
}: {
  viewKey: string;
  direction: ViewTransitionDirection;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate grid overflow-clip bg-background">
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <TransitionPage key={viewKey} direction={direction} reduceMotion={reduceMotion}>
          {children}
        </TransitionPage>
      </AnimatePresence>
    </div>
  );
}

function TransitionPage({ direction, reduceMotion, children }: {
  direction: ViewTransitionDirection;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPresent && document.activeElement instanceof HTMLElement && ref.current?.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, [isPresent]);

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={variants}
      initial={reduceMotion ? false : "initial"}
      animate="animate"
      exit={reduceMotion ? { x: "0%" } : "exit"}
      transition={{ ...(reduceMotion ? { duration: 0 } : VIEW_TRANSITION), zIndex: { duration: 0 } }}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      className="relative col-start-1 row-start-1 min-w-0 bg-background"
      style={{ pointerEvents: isPresent ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}
