import { INSPECTION_TABS } from "../model/config";
import type { InspectionTab } from "../model/types";

const TAB_LABELS = Object.fromEntries(INSPECTION_TABS) as Record<
  InspectionTab,
  string
>;

type InspectionTabsProps = {
  order: InspectionTab[];
  value: InspectionTab;
  onChange: (tab: InspectionTab) => void;
};

/** Primary four-item navigation. Its visual treatment is independent of belt tabs. */
export function InspectionTabs({
  order,
  value,
  onChange,
}: InspectionTabsProps) {
  return (
    <nav
      aria-label="巡检页面"
      className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 rounded-navigation bg-card/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur"
    >
      {order.map((id) => (
        <button
          key={id}
          type="button"
          aria-current={value === id ? "page" : undefined}
          onClick={() => onChange(id)}
          className={`segmented-item relative h-full rounded-navigation-item py-0 text-caption font-bold transition duration-200 before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${value === id ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground"}`}
        >
          {TAB_LABELS[id]}
        </button>
      ))}
    </nav>
  );
}
