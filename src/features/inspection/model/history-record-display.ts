import { getRecordDateKey } from "./history-filter";
import type { InspectionRecord } from "./types";

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** Format display text without changing the stored inspection or writing time. */
export function getHistoryRecordDisplay(record: InspectionRecord) {
  const dateKey = getRecordDateKey(record);
  const [year, month, day] = dateKey?.split("-") ?? [];
  const date = dateKey ? `${month}/${day}` : record.date;
  const dateCaption = dateKey
    ? `${year}年 · ${WEEKDAYS[new Date(`${dateKey}T00:00:00Z`).getUTCDay()]}`
    : "巡检日期";

  const localTime = /^(?:(\d{4})[./-](\d{1,2})[./-](\d{1,2})\s+)?(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(record.time.trim());
  let writingDate: string | null = null;
  let time = record.time;
  if (localTime && Number(localTime[4]) < 24 && Number(localTime[5]) < 60) {
    const [, writingYear, writingMonth, writingDay, hour, minute] = localTime;
    writingDate = writingYear
      ? getRecordDateKey({ ...record, date: `${writingYear}-${writingMonth}-${writingDay}` })
      : dateKey;
    if (writingYear && !writingDate) return { date, dateCaption, time, timeCaption: "填写时间" };
    time = `${hour.padStart(2, "0")}:${minute}`;
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(record.time)) {
    const timestamp = new Date(record.time);
    if (!Number.isNaN(timestamp.getTime())) {
      writingDate = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}`;
      time = `${String(timestamp.getHours()).padStart(2, "0")}:${String(timestamp.getMinutes()).padStart(2, "0")}`;
    }
  }

  let timeCaption = "填写时间";
  if (writingDate && writingDate !== dateKey) {
    const [writingYear, writingMonth, writingDay] = writingDate.split("-");
    timeCaption = writingYear === year
      ? `填写于 ${Number(writingMonth)}月${Number(writingDay)}日`
      : `填写于 ${writingYear}/${Number(writingMonth)}/${Number(writingDay)}`;
  }
  return { date, dateCaption, time, timeCaption };
}
