"use client";

import { useEffect, useRef, useState } from "react";

/** Reports whether a sticky element is held against its scroll container's edge. */
export function useStickyEdgeState(enabled: boolean) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let scrollContainer: HTMLElement | Window = window;
    for (let parent = elementRef.current?.parentElement; parent; parent = parent.parentElement) {
      if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) {
        scrollContainer = parent;
        break;
      }
    }

    const updateState = () => {
      const element = elementRef.current;
      if (!element) return;

      const { bottom, top } = element.getBoundingClientRect();
      const edge = scrollContainer instanceof HTMLElement
        ? scrollContainer.getBoundingClientRect().top + scrollContainer.clientTop + scrollContainer.clientHeight
          - parseFloat(getComputedStyle(scrollContainer).paddingBottom)
        : window.innerHeight;
      const nextIsStuck = bottom >= edge - 1 && top < edge;

      setIsStuck((current) =>
        current === nextIsStuck ? current : nextIsStuck,
      );
    };

    const frame = window.requestAnimationFrame(updateState);
    scrollContainer.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    const resizeObserver = new ResizeObserver(updateState);
    if (scrollContainer instanceof HTMLElement) resizeObserver.observe(scrollContainer);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  return { elementRef, isStuck: enabled && isStuck };
}
