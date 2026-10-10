"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./button";
import { useAppearance } from "@/hooks/use-appearance";
import { setAppearancePreference } from "@/lib/appearance";

const OPTIONS = [
  { value: "system", label: "跟随系统", Icon: Monitor },
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
] as const;

export function AppearancePicker({ disabled = false }: { disabled?: boolean }) {
  const { preference } = useAppearance();
  return (
    <section className="mt-4" aria-labelledby="appearance-heading">
      <p id="appearance-heading" className="mb-2 px-1 text-caption font-bold text-muted-foreground">外观</p>
      <div role="group" aria-label="界面外观" className="grid grid-cols-3 gap-2 rounded-card bg-muted p-2">
        {OPTIONS.map(({ value, label, Icon }) => (
          <Button key={value} type="button" variant="ghost" disabled={disabled}
            aria-pressed={preference === value}
            onClick={() => setAppearancePreference(value)}
            className={`flex-col gap-1 px-1 py-2 text-caption ${preference === value ? "bg-card text-foreground shadow-card hover:bg-card" : "hover:bg-transparent"}`}>
            <Icon className="size-4" aria-hidden="true" />{label}
          </Button>
        ))}
      </div>
    </section>
  );
}
