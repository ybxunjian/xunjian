import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DialogHeading({ id, title, description, icon, tone = "primary", variant = "default", truncate = false, className }: {
  id: string; title: string; description: ReactNode; icon?: ReactNode;
  tone?: "primary" | "success" | "warning";
  variant?: "default" | "compact" | "centered" | "account";
  truncate?: boolean; className?: string;
}) {
  return (
    <div className={cn(icon && "flex items-start gap-3 px-1 pt-1", variant === "centered" && "px-2 pb-4 pt-1 text-center", variant === "account" && "px-1 pb-3", className)}>
      {icon && <span className={cn("grid size-11 shrink-0 place-items-center rounded-control", tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" : "bg-secondary text-primary")}>{icon}</span>}
      <div className="min-w-0">
        <h3 id={id} className={cn("font-black text-foreground-strong", variant === "compact" ? "text-card-title" : "text-lg")}>{title}</h3>
        <p className={cn("text-muted-foreground", variant === "compact" ? "mt-2 text-caption" : variant === "account" ? "mt-0.5 text-caption" : "mt-1 text-body", truncate && "truncate")}>{description}</p>
      </div>
    </div>
  );
}
