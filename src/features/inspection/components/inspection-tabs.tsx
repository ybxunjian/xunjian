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
  const selectedIndex = Math.max(0, order.indexOf(value));

  return (
    <nav
      aria-label="巡检页面"
      className="sticky top-[max(0.75rem,env(safe-area-inset-top))] z-20 my-5 grid h-11 grid-cols-4 rounded-navigation bg-card/95 p-1 shadow-card ring-1 ring-inset ring-border/70 backdrop-blur"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-1">
        <span
          data-navigation-indicator=""
          className="block h-full w-1/4 rounded-navigation-item bg-primary shadow-card transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(${selectedIndex * 100}%)` }}
        />
      </div>
      {order.map((id) => (
        <button
          key={id}
          type="button"
          aria-current={value === id ? "page" : undefined}
          data-history-menu-transition={value !== id ? "exit" : undefined}
          onClick={() => onChange(id)}
          className={`segmented-item relative z-10 h-full rounded-navigation-item py-0 text-caption font-bold transition-colors duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] ${value === id ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {TAB_LABELS[id]}
        </button>
      ))}
    </nav>
  );
}
