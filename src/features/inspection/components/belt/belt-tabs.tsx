import { BELTS } from "../../model/config";
import type { BeltId } from "../../model/types";

type BeltTabsProps = {
  value: BeltId;
  onChange: (belt: BeltId) => void;
};

/** Three-item belt selector. Its neutral selected state is separate from primary navigation. */
export function BeltTabs({ value, onChange }: BeltTabsProps) {
  return (
    <div
      role="group"
      aria-label="皮带选择"
      className="sticky top-[calc(max(0.75rem,env(safe-area-inset-top))+3.25rem)] z-10 mb-4 grid h-11 grid-cols-3 gap-1 rounded-navigation bg-muted/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur"
    >
      {BELTS.map(({ id }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`segmented-item relative h-full rounded-navigation-item py-0 text-label font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${value === id ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
        >
          {id}
        </button>
      ))}
    </div>
  );
}
