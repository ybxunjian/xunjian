import { useSyncExternalStore } from "react";

type Mode = "normal" | "fixed";
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
