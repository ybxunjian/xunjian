import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ActionTile({ icon, title, description, onClick, disabled, tone = "muted" }: {
  icon: ReactNode; title: string; description?: ReactNode;
  onClick: () => void; disabled?: boolean; tone?: "muted" | "primary";
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn("flex w-full items-center gap-3 rounded-control px-4 text-left transition active:scale-[.98] disabled:cursor-default disabled:opacity-45", description ? "min-h-16" : "min-h-14", tone === "primary" ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground")}>
      <span className={cn("grid shrink-0 place-items-center bg-card text-primary shadow-card", description ? "size-11 rounded-control" : "size-9 rounded-small")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <b className={description ? "block text-card-title" : "block font-bold"}>{title}</b>
        {description && <span className={cn("mt-0.5 block text-caption", tone === "primary" ? "opacity-75" : "text-muted-foreground")}>{description}</span>}
      </span>
    </button>
  );
}
