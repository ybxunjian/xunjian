"use client";

import { motion } from "framer-motion";
import { useCalendarPager } from "../../hooks/use-calendar-pager";
import { calendarMonthDistance } from "../../model/calendar-paging";
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
  const currentDate = todayKey();
  const earliestMonth = getEarliestHistoryDate(records)?.slice(0, 7);
  const { anchor, visibleMonth, viewportRef, x, state, navigateTo, pointerHandlers } =
    useCalendarPager(month, earliestMonth, onMonthChange);
  const [year, monthNumber] = visibleMonth.split("-").map(Number);
  const hasEarlierRecords = earliestMonth !== undefined && visibleMonth > earliestMonth;
  const visibleMonths = Array.from({ length: 7 }, (_, index) => shiftHistoryMonth(visibleMonth, index - 3))
    .filter((pageMonth) => pageMonth >= (earliestMonth ?? anchor));
  const moveMonth = (offset: number) => navigateTo(shiftHistoryMonth(visibleMonth, offset));

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
            data-calendar-state={state}
            style={{ touchAction: "pan-y" }}
            className="relative select-none overflow-clip overscroll-x-contain"
            {...pointerHandlers}
            onDragStart={(event) => event.preventDefault()}
          >
            <motion.div className="grid w-full" style={{ x }}>
              {visibleMonths.map((pageMonth) => {
                const dates = getCalendarDates(pageMonth);
                return (
                  <div key={pageMonth} data-calendar-month={pageMonth}
                    aria-hidden={pageMonth !== visibleMonth} inert={pageMonth !== visibleMonth}
                    className="grid w-full grid-cols-7 gap-y-1"
                    style={{
                      gridArea: "1 / 1",
                      transform: `translateX(${calendarMonthDistance(anchor, pageMonth) * 100}%)`,
                      gridTemplateRows: "repeat(6, minmax(44px, auto))",
                    }}>
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
                          onClick={() => { navigateTo(pageMonth); onSelectRecord(dayRecords[0]); }}
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
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
