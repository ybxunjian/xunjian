import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";

export type ViewTransitionDirection = 1 | -1;

export const VIEW_ENTER_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const VIEW_EXIT_TRANSITION = {
  duration: 0.1,
  ease: [0.4, 0, 1, 1] as const,
};

type ViewMotion = { direction?: ViewTransitionDirection; reduceMotion: boolean };

const variants = {
  initial: ({ direction }: ViewMotion) => ({
    opacity: 0,
    x: direction ? direction * 16 : 0,
    y: direction ? 0 : 4,
  }),
  animate: ({ reduceMotion }: ViewMotion) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: reduceMotion ? { duration: 0 } : VIEW_ENTER_TRANSITION,
  }),
  exit: ({ direction, reduceMotion }: ViewMotion) => ({
    opacity: 0,
    x: direction ? -direction * 12 : 0,
    y: 0,
    transition: reduceMotion ? { duration: 0 } : VIEW_EXIT_TRANSITION,
  }),
};

type ViewTransitionProps = {
  viewKey: string;
  direction?: ViewTransitionDirection;
  reduceMotion: boolean;
  onViewReady?: (viewKey: string) => void;
  children: ReactNode;
};

/** Sequential content handover, with one live page and independent toolbars. */
export function ViewTransition({
  viewKey,
  direction,
  reduceMotion,
  onViewReady,
  children,
}: ViewTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const departingScroll = useRef<number | null>(null);
  const readyCallback = useRef(onViewReady);

  useLayoutEffect(() => {
    readyCallback.current = onViewReady;
  }, [onViewReady]);

  const beginExit = useCallback((key: string, element: HTMLDivElement) => {
    const container = containerRef.current;
    if (!container) return;

    // Keep the document occupied until the incoming content has been laid out.
    // Otherwise removing a long page can clamp scrollY before its replacement.
    container.style.minHeight = `${container.offsetHeight}px`;
    departingScroll.current = window.scrollY;
    scrollPositions.current.set(key, window.scrollY);

    if (document.activeElement instanceof HTMLElement && element.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }, []);

  const beginEnter = useCallback((key: string) => {
    const container = containerRef.current;
    if (!container) return;

    const previousScroll = departingScroll.current;
    container.style.minHeight = "";
    if (previousScroll !== null) {
      const target = scrollPositions.current.get(key) ?? previousScroll;
      const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: Math.min(target, maximum), left: window.scrollX, behavior: "instant" });
      departingScroll.current = null;
    }
    readyCallback.current?.(key);
  }, []);

  return (
    // Clip horizontal movement without introducing another scroll container.
    <div ref={containerRef} className="overflow-x-clip" data-view-transition="">
      <AnimatePresence initial={false} mode="wait" custom={{ direction, reduceMotion }}>
        <ViewFrame
          key={viewKey}
          viewKey={viewKey}
          direction={direction}
          reduceMotion={reduceMotion}
          onExitStart={beginExit}
          onEnterStart={beginEnter}
        >
          {children}
        </ViewFrame>
      </AnimatePresence>
    </div>
  );
}

function ViewFrame({
  viewKey,
  direction,
  reduceMotion,
  onExitStart,
  onEnterStart,
  children,
}: ViewTransitionProps & {
  onExitStart: (key: string, element: HTMLDivElement) => void;
  onEnterStart: (key: string) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent();

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (isPresent) onEnterStart(viewKey);
    else onExitStart(viewKey, element);
  }, [isPresent, viewKey, onEnterStart, onExitStart]);

  return (
    <motion.div
      ref={elementRef}
      data-view-key={viewKey}
      inert={!isPresent}
      aria-hidden={!isPresent || undefined}
      custom={{ direction, reduceMotion }}
      variants={variants}
      initial={reduceMotion ? false : "initial"}
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
