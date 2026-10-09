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

const reducedMotionVariants = {
  initial: { opacity: 1, x: 0 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 1, x: 0 },
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
    // Clip animated horizontal overflow without creating another scroll container.
    <div className="overflow-x-clip">
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={viewKey}
          custom={direction}
          variants={reduceMotion ? reducedMotionVariants : variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={reduceMotion ? { duration: 0 } : VIEW_TRANSITION}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
