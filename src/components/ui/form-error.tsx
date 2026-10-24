import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FormError({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return <div role="alert" aria-live="polite" className={cn("rounded-small bg-destructive-soft px-3 py-2 text-caption font-semibold text-destructive", className)}>{children}</div>;
}
