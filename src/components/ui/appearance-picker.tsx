"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./button";
import { useAppearance } from "@/hooks/use-appearance";
import { setAppearancePreference } from "@/lib/appearance";
import { useSegmentedNavigation } from "./use-segmented-navigation";

const OPTIONS = [
  { value: "system", label: "跟随系统", Icon: Monitor },
  { value: "light", label: "浅色", Icon: Sun },
  { value: "dark", label: "深色", Icon: Moon },
] as const;
const VALUES = OPTIONS.map(({ value }) => value);

export function AppearancePicker({ disabled = false }: { disabled?: boolean }) {
  const { preference } = useAppearance();
  const { root, thumb, initialIndex } = useSegmentedNavigation<(typeof VALUES)[number], HTMLDivElement>({
    items: VALUES,
    value: preference,
    highlightCrossedItems: false,
    onChange: (value) => { if (!disabled) setAppearancePreference(value); },
  });
  return (
    <section className="mt-4" aria-labelledby="appearance-heading">
      <p id="appearance-heading" className="mb-2 px-1 text-caption font-bold text-muted-foreground">外观</p>
      <div ref={root} role="group" aria-label="界面外观" aria-disabled={disabled || undefined} inert={disabled}
        className="appearance-segmented-navigation relative grid touch-none select-none grid-cols-3 gap-2 rounded-card bg-muted p-2">
        <span ref={thumb} aria-hidden="true"
          className={`segmented-navigation-thumb pointer-events-none absolute bottom-2 left-2 top-2 z-0 rounded-control bg-navigation-selection shadow-card ${disabled ? "opacity-45" : ""}`}
          style={{ width: "calc((100% - 2rem) / 3)", transform: `translate3d(calc(${initialIndex * 100}% + ${initialIndex * 0.5}rem),0,0)` }} />
        {OPTIONS.map(({ value, label, Icon }, index) => (
          <Button key={value} type="button" variant="ghost" disabled={disabled}
            data-segment-index={index}
            aria-pressed={preference === value}
            className={`segmented-item relative z-10 flex-col gap-1 px-1 py-2 text-caption hover:bg-transparent active:scale-100 ${preference === value ? "text-foreground" : ""}`}>
            <Icon className="size-4" aria-hidden="true" />{label}
          </Button>
        ))}
      </div>
    </section>
  );
}
