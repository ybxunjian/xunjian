"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
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
  const [year, monthNumber] = month.split("-").map(Number);
  const currentDate = todayKey();
  const earliestMonth = getEarliestHistoryDate(records)?.slice(0, 7);
  const hasEarlierRecords = earliestMonth !== undefined && month > earliestMonth;

  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchingRef = useRef(false);
  const pendingMonthRef = useRef(false);
  const activeIndex = hasEarlierRecords ? 1 : 0;
  const visibleMonths = hasEarlierRecords
    ? [shiftHistoryMonth(month, -1), month, shiftHistoryMonth(month, 1)]
    : [month, shiftHistoryMonth(month, 1)];

  const clearScrollTimer = () => {
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = null;
  };
  const finishScroll = () => {
    clearScrollTimer();
    const viewport = viewportRef.current;
    if (!viewport || !viewport.clientWidth || touchingRef.current || pendingMonthRef.current) return;
    const index = Math.round(viewport.scrollLeft / viewport.clientWidth);
    const offset = Math.max(0, Math.min(visibleMonths.length - 1, index)) - activeIndex;
    if (offset === 0) return;
    pendingMonthRef.current = true;
    onMonthChange(shiftHistoryMonth(month, offset));
  };
  const scheduleScrollEnd = () => {
    clearScrollTimer();
    // Fallback for Safari versions without scrollend; wait until momentum stops.
    if (!touchingRef.current) scrollTimerRef.current = setTimeout(finishScroll, 160);
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    clearScrollTimer();
    touchingRef.current = false;
    pendingMonthRef.current = false;
    const centerMonth = () => {
      viewport.scrollTo({ left: activeIndex * viewport.clientWidth, behavior: "instant" });
    };
    centerMonth();
    const observer = new ResizeObserver(centerMonth);
    observer.observe(viewport);
    return () => { observer.disconnect(); clearScrollTimer(); };
  }, [month, activeIndex]);

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
  }, [hasEarlierRecords]);

  const moveMonth = (offset: number) => {
    clearScrollTimer();
    onMonthChange(shiftHistoryMonth(month, offset));
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
          <div ref={viewportRef}
            role="region" aria-label="左右滑动切换月份"
            style={{ touchAction: hasEarlierRecords ? "pan-x pan-y" : "pan-right pan-y" }}
            className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={scheduleScrollEnd}
            onTouchStart={() => { touchingRef.current = true; clearScrollTimer(); }}
            onTouchEnd={() => { touchingRef.current = false; scheduleScrollEnd(); }}
            onTouchCancel={() => { touchingRef.current = false; scheduleScrollEnd(); }}
          >
            {visibleMonths.map((pageMonth) => {
              const dates = getCalendarDates(pageMonth);
              return (
                <div key={pageMonth} data-calendar-month={pageMonth}
                  aria-hidden={pageMonth !== month} inert={pageMonth !== month}
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
                        onClick={() => onSelectRecord(dayRecords[0])}
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
