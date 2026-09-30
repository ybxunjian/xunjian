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

  const moveMonth = (offset: number) => {
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
          <div className="grid grid-cols-7 gap-y-1">
            {getCalendarDates(month).map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
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
        </CardContent>
      </Card>
    </>
  );
}
