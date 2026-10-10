"use client";

import { forwardRef, useEffect, type ComponentProps, type ReactNode, type RefObject } from "react";
import { AnimatePresence, animate, mix, motion, useMotionValue, type HTMLMotionProps, type MotionValue } from "framer-motion";
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
export function useSplitConfirmationColor(
  progress: MotionValue<number>, fromToken: string, toToken: string,
  target: RefObject<HTMLElement | null>, property: "backgroundColor" | "color" = "backgroundColor", end = 1,
) {
  const color = useMotionValue(`var(${fromToken})`);
  useEffect(() => {
    let mixer: (value: number) => string;
    const updateProgress = () => {
      color.set(mixer(Math.max(0, Math.min(1, progress.get() / end))));
    };
    const updateAppearance = () => {
      const tokens = getComputedStyle(document.documentElement);
      mixer = mix(tokens.getPropertyValue(fromToken).trim(), tokens.getPropertyValue(toToken).trim());
      updateProgress();
      // Motion schedules its DOM render for the next frame. Write the same
      // resolved value now so CSS surfaces and this layer share the first paint.
      if (target.current) target.current.style[property] = color.get();
    };
    const unsubscribeAppearance = subscribeAppearance(updateAppearance);
    const unsubscribeProgress = progress.on("change", updateProgress);
    return () => { unsubscribeAppearance(); unsubscribeProgress(); };
  }, [color, progress, fromToken, toToken, target, property, end]);
  return color;
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
