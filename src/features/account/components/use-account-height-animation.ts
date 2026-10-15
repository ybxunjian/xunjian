import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import {
  PASSWORD_COLLAPSE_DURATION,
  PASSWORD_COLLAPSE_EASING,
  PASSWORD_EASING,
  PASSWORD_EXPAND_DURATION,
} from "./account-password-motion";

/** The password form grows while the preferences below it shrink on the same timeline. */
export function useAccountHeightAnimation({
  open,
  initialOpen,
  expandingPassword = open,
  restoreAuto = false,
  onCollapsed,
}: {
  open: boolean;
  initialOpen: boolean;
  expandingPassword?: boolean;
  restoreAuto?: boolean;
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
      const contentHeight = content.getBoundingClientRect().height;
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
        container.style.height = open && restoreAuto ? "auto" : `${target}px`;
        stopAnimation?.();
        stopAnimation = undefined;
        if (!open) collapsedRef.current?.();
      };
      if (reduceMotion || from === target) {
        finish();
        return;
      }
      const duration = expandingPassword ? PASSWORD_EXPAND_DURATION : PASSWORD_COLLAPSE_DURATION;
      const ease = expandingPassword ? PASSWORD_EASING : PASSWORD_COLLAPSE_EASING;
      if (typeof container.animate === "function") {
        // Height still requires layout; WAAPI removes JS's per-frame height writes.
        const animation = container.animate([{ height: `${from}px` }, { height: `${target}px` }], {
          duration: duration * 1000,
          easing: `cubic-bezier(${ease.join(",")})`,
          fill: "forwards",
        });
        stopAnimation = () => { animation.onfinish = null; animation.cancel(); };
        animation.onfinish = finish;
      } else {
        const animation = animate(container, { height: [from, target] }, { duration, ease, onComplete: finish });
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
  }, [open, initialOpen, expandingPassword, restoreAuto, reduceMotion]);

  return { containerRef, contentRef };
}
