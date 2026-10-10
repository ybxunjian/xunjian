"use client";

import { forwardRef, useEffect, type ComponentProps, type ReactNode } from "react";
import { AnimatePresence, animate, mix, motion, useMotionValue, useTransform, type HTMLMotionProps, type MotionValue } from "framer-motion";
import { Button } from "./button";
import { subscribeAppearance } from "@/lib/appearance";

const MotionButton = motion.create(Button);
const SPLIT_TRANSITIONS = {
  open: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const },
  closed: { duration: 0.22, ease: [0.25, 0.1, 0.35, 1] as const },
};

export function getSplitConfirmationTransition(open: boolean, reduceMotion: boolean) {
  const transition = SPLIT_TRANSITIONS[open ? "open" : "closed"];
  return { ...transition, duration: reduceMotion ? 0 : transition.duration };
}

export function useSplitConfirmationMotion(open: boolean, reduceMotion: boolean, isPresent: boolean) {
  const progress = useMotionValue(0);
  const transition = getSplitConfirmationTransition(open, reduceMotion);
  useEffect(() => {
    if (!isPresent) return;
    const controls = animate(progress, open ? 1 : 0, getSplitConfirmationTransition(open, reduceMotion));
    return () => controls.stop();
  }, [open, reduceMotion, isPresent, progress]);
  return { progress, transition };
}

/** Resolve semantic tokens before mixing, so CSS variable strings cannot jump. */
export function useSplitConfirmationColor(progress: MotionValue<number>, fromToken: string, toToken: string, end = 1) {
  const from = useMotionValue(`var(${fromToken})`);
  const to = useMotionValue(`var(${toToken})`);
  const colorProgress = useTransform(progress, [0, end], [0, 1]);
  useEffect(() => {
    const update = () => {
      const tokens = getComputedStyle(document.documentElement);
      from.set(tokens.getPropertyValue(fromToken).trim());
      to.set(tokens.getPropertyValue(toToken).trim());
    };
    return subscribeAppearance(update);
  }, [from, to, fromToken, toToken]);
  return useTransform(() => mix(from.get(), to.get())(colorProgress.get()));
}

type SplitConfirmationButtonProps = Omit<HTMLMotionProps<"button">, "children"> &
  Pick<ComponentProps<typeof Button>, "variant" | "size"> & {
    open: boolean;
    reduceMotion: boolean;
    closedContent?: ReactNode;
    openContent?: ReactNode;
    openContentKey?: string;
    surface?: ReactNode;
    closedContentClassName?: string;
    openContentClassName?: string;
  };

/** Stable content layers crossfade without measuring, clipping or scaling text. */
export const SplitConfirmationButton = forwardRef<HTMLButtonElement, SplitConfirmationButtonProps>(
  function SplitConfirmationButton({
    open, reduceMotion, closedContent, openContent, openContentKey, surface,
    closedContentClassName = "", openContentClassName = "", ...props
  }, ref) {
    const { duration } = getSplitConfirmationTransition(open, reduceMotion);
    const textTransition = { duration, ease: "easeInOut" as const };
    const contentClassName = "pointer-events-none absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap";
    const openLayer = (
      <motion.span
        key={openContentKey}
        className={`${contentClassName} ${openContentClassName}`}
        initial={openContentKey ? { opacity: 0 } : false}
        animate={{ opacity: open ? 1 : 0 }}
        exit={{ opacity: 0 }}
        transition={textTransition}
        aria-hidden="true"
      >{openContent}</motion.span>
    );
    return (
      <MotionButton ref={ref} initial={false} {...props}>
        {surface}
        {closedContent !== undefined && (
          <motion.span
            className={`${contentClassName} ${closedContentClassName}`}
            initial={false}
            animate={{ opacity: open ? 0 : 1 }}
            transition={textTransition}
            aria-hidden="true"
          >{closedContent}</motion.span>
        )}
        {openContent !== undefined && (openContentKey
          ? <AnimatePresence initial={false}>{openLayer}</AnimatePresence>
          : openLayer)}
      </MotionButton>
    );
  },
);
