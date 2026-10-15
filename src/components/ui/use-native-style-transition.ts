import { useEffect, type RefObject } from "react";
import { animate, mix, time, useMotionValue } from "framer-motion";

type StyleTransition = {
  duration: number;
  delay?: number;
  ease: readonly [number, number, number, number] | "easeInOut" | "linear";
};

/** Keep a MotionValue as the base style, but let WAAPI interpolate between changes. */
export function useNativeStyleTransition<T extends string | number>({
  targetRef, property, initial, value, transition, active,
}: {
  targetRef: RefObject<HTMLElement | null>;
  property: "width" | "right" | "opacity";
  initial: T;
  value: T;
  transition: StyleTransition;
  active: boolean;
}) {
  const motionValue = useMotionValue(initial);
  const { duration, delay = 0, ease } = transition;

  useEffect(() => {
    const element = targetRef.current;
    if (!element || !active) return;
    const from = motionValue.get();
    const write = (next: T) => {
      motionValue.set(next);
      element.style[property] = String(next);
    };
    if (duration === 0) {
      write(value);
      return;
    }
    if (from === value) return;
    if (typeof element.animate !== "function") {
      const animation = animate(motionValue, value, { duration, delay, ease });
      return () => animation.stop();
    }

    let finished = false;
    const interpolate = mix(from, value);
    const animation = element.animate([{ [property]: from }, { [property]: value }], {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: typeof ease === "string"
        ? ease === "easeInOut" ? "ease-in-out" : ease
        : `cubic-bezier(${ease.join(",")})`,
      fill: "both",
    });
    // Match Motion's clock so native geometry and JS-driven color share a timeline.
    const startTime = time.now();
    animation.startTime = startTime;
    animation.onfinish = () => {
      finished = true;
      write(value);
      animation.onfinish = null;
      animation.cancel();
    };
    return () => {
      animation.onfinish = null;
      if (!finished) {
        animation.currentTime = Math.max(0, time.now() - startTime);
        // Preserve calc percentages, rather than freezing widths in pixels on resize.
        const progress = animation.effect?.getComputedTiming().progress ?? 0;
        write(interpolate(progress));
      }
      animation.cancel();
    };
  }, [targetRef, property, value, active, motionValue, duration, delay, ease]);

  return motionValue;
}
