import { useSyncExternalStore } from "react";

export type HistoryMenuCheckMode = "normal" | "fixed" | "anchor";
type Mode = HistoryMenuCheckMode;
let mode: Mode = "normal";
const listeners = new Set<() => void>();

export function setHistoryMenuMotionCheck(nextMode: Mode) {
  if (mode === nextMode) return;
  mode = nextMode;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Temporary in-memory switch, set only by the opt-in diagnostic panel. */
export function useFixedHistoryMenuLines() {
  return useSyncExternalStore(subscribe, () => mode === "fixed", () => false);
}

/** Exclude only the menu subtree from scroll anchoring; preserve its animation. */
export function useExcludeHistoryMenuAnchor() {
  return useSyncExternalStore(subscribe, () => mode === "anchor", () => false);
}
