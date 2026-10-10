"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createSegmentedNavigationMotion } from "@/components/ui/segmented-navigation-controller";
import { BELTS } from "../../model/config";
import type { BeltId } from "../../model/types";

type BeltTabsProps = {
  value: BeltId;
  onChange: (belt: BeltId) => void;
};

/** Belt-specific appearance and state; motion is shared with primary navigation. */
export function BeltTabs({ value, onChange }: BeltTabsProps) {
  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const controller = useRef<ReturnType<typeof createSegmentedNavigationMotion> | null>(null);
  const latest = useRef({ value, onChange });
  const reduced = useReducedMotion();
  const selectedIndex = Math.max(0, BELTS.findIndex(({ id }) => id === value));
  const [initialIndex] = useState(selectedIndex);

  useLayoutEffect(() => {
    latest.current = { value, onChange };
  });

  useLayoutEffect(() => {
    if (!root.current || !thumb.current) return;
    const instance = createSegmentedNavigationMotion(
      root.current,
      thumb.current,
      BELTS.length,
      Math.max(0, BELTS.findIndex(({ id }) => id === latest.current.value)),
      Boolean(reduced),
      (index) => {
        const belt = BELTS[index]?.id;
        if (belt && belt !== latest.current.value) latest.current.onChange(belt);
      },
    );
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
  }, [reduced]);

  useLayoutEffect(() => {
    controller.current?.setIndex(selectedIndex);
  }, [selectedIndex]);

  return (
    <div
      ref={root}
      role="group"
      aria-label="皮带选择"
      className="belt-segmented-navigation sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] z-10 mb-4 grid h-11 grid-cols-3 gap-1 touch-none select-none rounded-navigation bg-muted/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur"
    >
      <span
        ref={thumb}
        aria-hidden="true"
        className="segmented-navigation-thumb pointer-events-none absolute left-1 top-1 z-0 h-9 rounded-navigation-item bg-navigation-selection shadow-card"
        style={{
          width: "calc((100% - 1rem) / 3)",
          transform: "translate3d(calc(" + initialIndex + " * (100% + 0.25rem)),0,0)",
        }}
      />
      {BELTS.map(({ id: belt }, index) => (
        <button
          key={belt}
          type="button"
          data-segment-index={index}
          aria-pressed={value === belt}
          className={"segmented-item relative z-10 h-full rounded-navigation-item py-0 text-label font-bold before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] " + (value === belt ? "text-primary" : "text-muted-foreground")}
        >
          <span>{belt}</span>
        </button>
      ))}
    </div>
  );
}
