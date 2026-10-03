import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ViewTransitionDirection = 1 | -1;

export const VIEW_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1] as const,
};

const variants = {
  initial: (direction: ViewTransitionDirection) => ({
    opacity: 0,
    x: direction === 1 ? 18 : -18,
  }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: ViewTransitionDirection) => ({
    opacity: 0,
    x: direction === 1 ? -14 : 18,
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
    <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div
        key={viewKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={reduceMotion ? { duration: 0 } : VIEW_TRANSITION}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
