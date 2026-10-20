import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import {
  PASSWORD_COLLAPSE_DURATION,
  PASSWORD_COLLAPSE_EASING,
  PASSWORD_EASING,
  PASSWORD_EXPAND_DURATION,
} from "./account-password-motion";

const HEIGHT_PROPERTY = "--account-password-height";

/** Animate password form height while the surrounding content stays in normal flow. */
export function useAccountHeightAnimation({
  open,
  initialOpen,
  onCollapsed,
}: {
  open: boolean;
  initialOpen: boolean;
  onCollapsed?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef(onCollapsed);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => { collapsedRef.current = onCollapsed; }, [onCollapsed]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    let targetHeight: number | undefined;
    let stopAnimation: (() => void) | undefined;

    const update = () => {
      const contentHeight = Math.ceil(content.getBoundingClientRect().height);
      const target = open ? contentHeight : 0;
      if (target === targetHeight) return;
      targetHeight = target;
      // Read the displayed height before cancelling, including a mid-animation reversal.
      const from = container.style.height
        ? parseFloat(getComputedStyle(container).height)
        : initialOpen ? contentHeight : 0;
      stopAnimation?.();
      stopAnimation = undefined;
      container.style.height = `${from}px`;

      const finish = () => {
        container.style.height = `${target}px`;
        stopAnimation?.();
        stopAnimation = undefined;
        if (!open) collapsedRef.current?.();
      };
      if (reduceMotion || from === target) {
        finish();
        return;
      }
      const duration = open ? PASSWORD_EXPAND_DURATION : PASSWORD_COLLAPSE_DURATION;
      const ease = open ? PASSWORD_EASING : PASSWORD_COLLAPSE_EASING;
      if (typeof container.animate === "function" && typeof CSS !== "undefined" && typeof CSS.registerProperty === "function") {
        // Height still requires layout; WAAPI removes JS's per-frame height writes.
        // Integer interpolation prevents fractional height fighting scroll-range rounding.
        container.style.setProperty(HEIGHT_PROPERTY, String(Math.round(from)));
        container.style.height = `calc(var(${HEIGHT_PROPERTY}) * 1px)`;
        const animation = container.animate([{ [HEIGHT_PROPERTY]: Math.round(from) }, { [HEIGHT_PROPERTY]: target }], {
          duration: duration * 1000,
          easing: `cubic-bezier(${ease.join(",")})`,
          fill: "forwards",
        });
        stopAnimation = () => { animation.onfinish = null; animation.cancel(); };
        animation.onfinish = finish;
      } else {
        const animation = animate(from, target, {
          duration, ease,
          onUpdate: (height) => { container.style.height = `${Math.round(height)}px`; },
          onComplete: finish,
        });
        stopAnimation = () => animation.stop();
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(content);
    return () => {
      observer.disconnect();
      if (stopAnimation) {
        container.style.height = getComputedStyle(container).height;
        stopAnimation();
      }
    };
  }, [open, initialOpen, reduceMotion]);

  return { containerRef, contentRef };
}
