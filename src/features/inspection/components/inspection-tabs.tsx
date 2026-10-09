"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createSegmentedNavigationMotion } from "@/components/ui/segmented-navigation-controller";
import { INSPECTION_TABS } from "../model/config";
import type { InspectionTab } from "../model/types";

const TAB_LABELS = Object.fromEntries(INSPECTION_TABS) as Record<InspectionTab, string>;
type InspectionTabsProps = { order: InspectionTab[]; value: InspectionTab; onChange: (tab: InspectionTab) => void };

/** Four-page navigation with a persistent, independently animated thumb. */
export function InspectionTabs({ order, value, onChange }: InspectionTabsProps) {
  const root = useRef<HTMLElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const controller = useRef<ReturnType<typeof createSegmentedNavigationMotion> | null>(null);
  const latest = useRef({ order, value, onChange });
  const reduced = useReducedMotion();
  const orderKey = order.join(",");
  const selectedIndex = Math.max(0, order.indexOf(value));
  const [initialIndex] = useState(selectedIndex);

  useLayoutEffect(() => { latest.current = { order, value, onChange }; });
  useLayoutEffect(() => {
    if (!root.current || !thumb.current) return;
    const current = latest.current;
    const instance = createSegmentedNavigationMotion(
      root.current, thumb.current, current.order.length,
      Math.max(0, current.order.indexOf(current.value)), Boolean(reduced),
      (index) => {
        const tab = latest.current.order[index];
        if (tab && tab !== latest.current.value) latest.current.onChange(tab);
      },
    );
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [orderKey, reduced]);
  useLayoutEffect(() => { controller.current?.setIndex(selectedIndex); }, [selectedIndex]);

  return (
    <nav ref={root} aria-label="巡检页面"
      className="primary-segmented-navigation sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 touch-pan-y select-none rounded-navigation bg-navigation-track p-1 ring-1 ring-inset ring-navigation-border">
      <span ref={thumb} aria-hidden="true"
        className="segmented-navigation-thumb pointer-events-none absolute left-1 top-1 z-0 h-9 rounded-navigation-item bg-card"
        style={{ width: "calc((100% - 0.5rem) / 4)", transform: "translate3d(" + initialIndex * 100 + "%,0,0)" }} />
      {order.map((tab, index) => (
        <button key={tab} type="button" data-segment-index={index}
          aria-current={value === tab ? "page" : undefined}
          data-history-menu-transition={value !== tab ? "exit" : undefined}
          className={"segmented-item relative z-10 h-full rounded-navigation-item py-0 text-caption font-extrabold before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] " + (value === tab ? "text-navigation-foreground" : "text-navigation-muted")}>
          <span>{TAB_LABELS[tab]}</span>
        </button>
      ))}
    </nav>
  );
}
