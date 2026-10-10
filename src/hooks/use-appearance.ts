"use client";

import { useSyncExternalStore } from "react";
import { getAppearanceSnapshot, getServerAppearanceSnapshot, subscribeAppearance, type AppearancePreference, type ColorScheme } from "@/lib/appearance";

export function useAppearance() {
  const snapshot = useSyncExternalStore(subscribeAppearance, getAppearanceSnapshot, getServerAppearanceSnapshot);
  const [preference, scheme] = snapshot.split(":") as [AppearancePreference, ColorScheme];
  return { preference, scheme };
}
