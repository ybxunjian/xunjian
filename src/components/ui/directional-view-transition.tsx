import type { ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";

export type ViewTransitionDirection = 1 | -1;

export const VIEW_TRANSITION = {
  duration: 0.24,
  delay: 0.04,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export const VIEW_EXIT_TRANSITION = {
  duration: 0.1,
  ease: [0.4, 0, 1, 1] as const,
};

const variants = {
  initial: (direction: ViewTransitionDirection) => ({
    opacity: 0,
    transform: direction === 1 ? "translateX(18px)" : "translateX(-18px)",
  }),
  // A complete transform is eligible for Motion's native animation path; x is not.
  animate: {
    opacity: 1,
    transform: "translateX(0px)",
    transition: VIEW_TRANSITION,
  },
  exit: (direction: ViewTransitionDirection) => ({
    opacity: 0,
    transform: direction === 1 ? "translateX(-14px)" : "translateX(18px)",
    transition: VIEW_EXIT_TRANSITION,
  }),
};

function TransitionPage({
  direction,
  reduceMotion,
  children,
}: {
  direction: ViewTransitionDirection;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.div
      className="col-start-1 row-start-1 min-w-0 self-start"
      inert={!isPresent}
      aria-hidden={!isPresent ? true : undefined}
      custom={direction}
      variants={reduceMotion ? reducedMotionVariants : variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduceMotion ? { duration: 0 } : VIEW_TRANSITION}
    >
      {children}
    </motion.div>
  );
}

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
    <div className="grid grid-cols-1 overflow-x-clip">
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <TransitionPage
          key={viewKey}
          direction={direction}
          reduceMotion={reduceMotion}
        >
          {children}
        </TransitionPage>
      </AnimatePresence>
    </div>
  );
}
