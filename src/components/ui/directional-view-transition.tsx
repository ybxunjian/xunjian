"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useIsPresent, useMotionValue } from "framer-motion";

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
  restoreScroll = true,
  children,
}: {
  viewKey: string;
  direction: ViewTransitionDirection;
  reduceMotion: boolean;
  restoreScroll?: boolean;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportHeight = useRef(0);
  const scrollPositions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // The outer tab uses wait mode. Keep its departing window intact when the
    // application switches back to document scrolling before the tab fades out.
    if (!isPresent) {
      viewport.style.height = `${viewportHeight.current}px`;
      return;
    }
    viewport.style.height = "";
    viewportHeight.current = viewport.clientHeight;
    const observer = new ResizeObserver(() => {
      viewportHeight.current = viewport.clientHeight;
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [isPresent]);

  return (
    <div ref={viewportRef} className="relative isolate h-full min-h-0 overflow-clip bg-background" style={{ contain: "layout paint" }}>
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <TransitionPage key={viewKey} viewKey={viewKey} direction={direction} reduceMotion={reduceMotion} restoreScroll={restoreScroll} scrollPositions={scrollPositions}>
          {children}
        </TransitionPage>
      </AnimatePresence>
    </div>
  );
}

function TransitionPage({ viewKey, direction, reduceMotion, restoreScroll, scrollPositions, children }: {
  viewKey: string;
  direction: ViewTransitionDirection;
  reduceMotion: boolean;
  restoreScroll: boolean;
  scrollPositions: RefObject<Map<string, number>>;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const willChange = useMotionValue(reduceMotion ? "auto" : "transform");

  // Restore before paint so the returning page slides in at its original position.
  useLayoutEffect(() => {
    if (isPresent && scrollRef.current) {
      scrollRef.current.scrollTop = restoreScroll ? scrollPositions.current.get(viewKey) ?? 0 : 0;
    }
  }, [isPresent, restoreScroll, scrollPositions, viewKey]);

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
      onAnimationStart={() => willChange.set(reduceMotion ? "auto" : "transform")}
      onAnimationComplete={() => willChange.set("auto")}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      className="absolute inset-0 min-h-0 min-w-0 overflow-hidden bg-background"
      style={{ pointerEvents: isPresent ? "auto" : "none", willChange }}
    >
      <div
        ref={scrollRef}
        data-view-scroll={viewKey}
        className="h-full overflow-y-auto overscroll-y-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          if (restoreScroll && isPresent) scrollPositions.current.set(viewKey, event.currentTarget.scrollTop);
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}
