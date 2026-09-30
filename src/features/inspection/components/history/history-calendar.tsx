"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCalendarDates,
  getEarliestHistoryDate,
  groupHistoryRecordsByDate,
  shiftHistoryMonth,
} from "../../model/history-filter";
import type { InspectionRecord } from "../../model/types";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function monthDistance(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

type HistoryCalendarProps = {
  records: InspectionRecord[];
  month: string;
  onMonthChange: (month: string) => void;
  onSelectRecord: (record: InspectionRecord) => void;
};

export function HistoryCalendar({
  records, month, onMonthChange, onSelectRecord,
}: HistoryCalendarProps) {
  const grouped = groupHistoryRecordsByDate(records);
  const [visibleMonth, setVisibleMonth] = useState(month);
  const [year, monthNumber] = visibleMonth.split("-").map(Number);
  const currentDate = todayKey();
  const earliestMonth = getEarliestHistoryDate(records)?.slice(0, 7);
  const hasEarlierRecords = earliestMonth !== undefined && visibleMonth > earliestMonth;

  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchingRef = useRef(false);
  const displayedMonthRef = useRef(month);
  const committedMonthRef = useRef(month);
  const pendingPositionRef = useRef<number | null>(null);
  const [initialMonth] = useState(month);
  const minimumMonth = earliestMonth ?? initialMonth;
  const getRange = (center: string) => ({
    first: shiftHistoryMonth(center, -3) < minimumMonth ? minimumMonth : shiftHistoryMonth(center, -3),
    last: shiftHistoryMonth(center, 3),
  });
  const [range, setRange] = useState(() => getRange(month));
  const [navigationVersion, setNavigationVersion] = useState(0);
  const visibleMonths: string[] = [];
  for (let pageMonth = range.first; pageMonth <= range.last; pageMonth = shiftHistoryMonth(pageMonth, 1)) {
    visibleMonths.push(pageMonth);
  }

  const clearScrollTimer = () => {
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = null;
  };
  const nearestMonth = () => {
    const viewport = viewportRef.current;
    if (!viewport?.clientWidth) return displayedMonthRef.current;
    const pageIndex = Math.round(viewport.scrollLeft / viewport.clientWidth);
    const firstIndex = monthDistance(minimumMonth, range.first);
    const index = Math.max(0, Math.min(visibleMonths.length - 1, pageIndex - firstIndex));
    return visibleMonths[index];
  };
  const publishMonth = (next: string) => {
    if (next === displayedMonthRef.current) return;
    displayedMonthRef.current = next;
    setVisibleMonth(next);
  };
  const commitMonth = (next: string) => {
    publishMonth(next);
    if (committedMonthRef.current === next) return;
    committedMonthRef.current = next;
    onMonthChange(next);
  };
  const replaceRange = (next: typeof range, center?: string) => {
    if (center) {
      pendingPositionRef.current = monthDistance(minimumMonth, center);
      // A new native scroller discards momentum from the superseded gesture.
      setNavigationVersion((version) => version + 1);
    }
    setRange(next);
  };
  const finishScroll = () => {
    clearScrollTimer();
    if (touchingRef.current || pendingPositionRef.current !== null) return;
    const next = nearestMonth();
    commitMonth(next);
    const nextRange = getRange(next);
    if (nextRange.first !== range.first || nextRange.last !== range.last) replaceRange(nextRange);
  };
  const scheduleScrollEnd = () => {
    clearScrollTimer();
    if (!touchingRef.current) scrollTimerRef.current = setTimeout(finishScroll, 160);
  };
  const handleScroll = () => {
    if (pendingPositionRef.current !== null) return;
    const next = nearestMonth();
    publishMonth(next);
    // The leading spacer keeps every month at a stable absolute position.
    // Filling it with earlier pages never changes scrollLeft or native momentum.
    const nextRange = getRange(next);
    if (nextRange.first < range.first || nextRange.last > range.last) setRange({
      first: nextRange.first < range.first ? nextRange.first : range.first,
      last: nextRange.last > range.last ? nextRange.last : range.last,
    });
    scheduleScrollEnd();
  };
  const beginTouch = () => {
    clearScrollTimer();
    touchingRef.current = true;
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (pendingPositionRef.current === null) return;
    viewport.scrollTo({ left: pendingPositionRef.current * viewport.clientWidth, behavior: "instant" });
    pendingPositionRef.current = null;
  }, [range]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    // A parent-driven month change (arrows or a new selection) is navigation.
    // Scroll-driven title updates must not reset or cancel native scrolling.
    if (committedMonthRef.current !== month) {
      clearScrollTimer();
      touchingRef.current = false;
      committedMonthRef.current = month;
      publishMonth(month);
      replaceRange(getRange(month), month);
    }
  });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (navigationVersion === 0) {
      viewport.scrollTo({ left: monthDistance(minimumMonth, month) * viewport.clientWidth, behavior: "instant" });
    }
    let width = viewport.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === viewport.clientWidth) return;
      const position = width ? viewport.scrollLeft / width : 0;
      width = viewport.clientWidth;
      viewport.scrollTo({ left: position * width, behavior: "instant" });
    });
    observer.observe(viewport);
    return () => { observer.disconnect(); clearScrollTimer(); };
    // Reattach only for explicit navigation; scrolling keeps the same element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationVersion]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("scrollend", finishScroll);
    return () => viewport.removeEventListener("scrollend", finishScroll);
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || hasEarlierRecords || CSS.supports("touch-action", "pan-right pan-y")) return;
    let start: { x: number; y: number } | null = null;
    const begin = (event: TouchEvent) => {
      const touch = event.touches[0];
      start = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const guardBoundary = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (dx > 8 && dx > Math.abs(dy) && event.cancelable) event.preventDefault();
    };
    const end = () => { start = null; };
    viewport.addEventListener("touchstart", begin, { passive: true });
    viewport.addEventListener("touchmove", guardBoundary, { passive: false });
    viewport.addEventListener("touchend", end);
    viewport.addEventListener("touchcancel", end);
    return () => {
      viewport.removeEventListener("touchstart", begin);
      viewport.removeEventListener("touchmove", guardBoundary);
      viewport.removeEventListener("touchend", end);
      viewport.removeEventListener("touchcancel", end);
    };
  }, [hasEarlierRecords, navigationVersion]);

  const moveMonth = (offset: number) => {
    clearScrollTimer();
    touchingRef.current = false;
    const next = shiftHistoryMonth(displayedMonthRef.current, offset);
    commitMonth(next);
    replaceRange(getRange(next), next);
  };

  return (
    <>
      <div className="mb-3 flex min-h-11 items-center justify-between gap-2">
        <h2 className="text-title font-black">巡检日历</h2>
      </div>
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            {hasEarlierRecords ? (
              <Button type="button" variant="ghost" size="icon" aria-label="上一个月" onClick={() => moveMonth(-1)}>
                <ChevronLeft size={20} />
              </Button>
            ) : <span className="size-11 shrink-0" aria-hidden="true" />}
            <h3 className="text-card-title font-bold" aria-live="polite">{year}年{monthNumber}月</h3>
            <Button type="button" variant="ghost" size="icon" aria-label="下一个月" onClick={() => moveMonth(1)}>
              <ChevronRight size={20} />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-caption text-muted-foreground" aria-hidden="true">
            {WEEKDAYS.map((day) => <span key={day} className="py-2">{day}</span>)}
          </div>
          <div key={navigationVersion} ref={viewportRef}
            role="region" aria-label="左右滑动切换月份"
            style={{ touchAction: hasEarlierRecords ? "pan-x pan-y" : "pan-right pan-y" }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={handleScroll}
            onTouchStart={beginTouch}
            onTouchEnd={() => { touchingRef.current = false; scheduleScrollEnd(); }}
            onTouchCancel={() => { touchingRef.current = false; scheduleScrollEnd(); }}
          >
            <div aria-hidden="true" inert className="shrink-0"
              style={{ flexBasis: `${monthDistance(minimumMonth, range.first) * 100}%` }} />
            {visibleMonths.map((pageMonth) => {
              const dates = getCalendarDates(pageMonth);
              return (
                <div key={pageMonth} data-calendar-month={pageMonth}
                  aria-hidden={pageMonth !== visibleMonth} inert={pageMonth !== visibleMonth}
                  className="grid w-full shrink-0 snap-start snap-always grid-cols-7 gap-y-1">
                  {Array.from({ length: 42 }, (_, index) => dates[index] ?? null).map((date, index) => {
                    if (!date) return <span key={`empty-${index}`} className="min-h-11" />;
                    const dayRecords = grouped.get(date) ?? [];
                    const count = dayRecords.length;
                    const today = currentDate === date;
                    const day = Number(date.slice(-2));
                    if (!count) {
                      return (
                        <span
                          key={date}
                          aria-current={today ? "date" : undefined}
                          className={`mx-auto flex min-h-11 w-full max-w-12 items-center justify-center rounded-control text-body ${today ? "bg-secondary text-primary" : "text-subtle-foreground"}`}
                        >
                          {day}
                        </span>
                      );
                    }
                    return (
                      <button
                        type="button"
                        key={date}
                        onClick={() => { commitMonth(pageMonth); onSelectRecord(dayRecords[0]); }}
                        aria-label={`查看 ${date} 的巡检详情，${count} 条记录`}
                        aria-current={today ? "date" : undefined}
                        className={`mx-auto flex min-h-11 w-full max-w-12 items-center justify-center rounded-control text-card-title font-bold transition hover:bg-muted active:scale-[.97] ${today ? "bg-secondary text-primary" : "text-foreground-strong"}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
