"use client";

import { Toaster } from "sonner";
import { useAppearance } from "@/hooks/use-appearance";

export function AppearanceRuntime() {
  const { scheme } = useAppearance();
  return <Toaster position="top-center" theme={scheme} richColors />;
}
