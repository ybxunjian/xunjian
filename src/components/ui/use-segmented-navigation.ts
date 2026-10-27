"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { createSegmentedNavigationMotion } from "./segmented-navigation-controller";

/** Bind the DOM controller to React; callers own item labels, layout and selection. */
export function useSegmentedNavigation<Item extends string, Root extends HTMLElement>({
  items, value, onChange, highlightCrossedItems = true,
}: {
  items: readonly Item[];
  value: Item;
  onChange: (item: Item) => void;
  highlightCrossedItems?: boolean;
}) {
  const root = useRef<Root>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const controller = useRef<ReturnType<typeof createSegmentedNavigationMotion> | null>(null);
  const latest = useRef({ items, value, onChange });
  const reduced = useReducedMotion();
  const itemsKey = JSON.stringify(items);
  const selectedIndex = Math.max(0, items.indexOf(value));
  const [initialIndex] = useState(selectedIndex);

  useLayoutEffect(() => { latest.current = { items, value, onChange }; });
  useLayoutEffect(() => {
    if (!root.current || !thumb.current) return;
    const current = latest.current;
    const instance = createSegmentedNavigationMotion(
      root.current, thumb.current, current.items.length,
      Math.max(0, current.items.indexOf(current.value)), Boolean(reduced),
      (index) => {
        const item = latest.current.items[index];
        if (item !== undefined && item !== latest.current.value) latest.current.onChange(item);
      },
      highlightCrossedItems,
    );
    controller.current = instance;
    return () => { instance.destroy(); controller.current = null; };
  }, [itemsKey, reduced, highlightCrossedItems]);
  useLayoutEffect(() => { controller.current?.setIndex(selectedIndex); }, [selectedIndex]);

  return { root, thumb, initialIndex };
}
