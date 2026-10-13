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
    transform: direction === 1 ? "translateX(18px)" : "translateX(-18px)",
  }),
  // A complete transform is eligible for Motion's native animation path; x is not.
  animate: { opacity: 1, transform: "translateX(0px)" },
  exit: (direction: ViewTransitionDirection) => ({
    opacity: 0,
    transform: direction === 1 ? "translateX(-14px)" : "translateX(18px)",
  }),
};

const reducedMotionVariants = {
  initial: { opacity: 1, transform: "translateX(0px)" },
  animate: { opacity: 1, transform: "translateX(0px)" },
  exit: { opacity: 1, transform: "translateX(0px)" },
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
