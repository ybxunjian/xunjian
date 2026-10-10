import type { InspectionRecord } from "./types";

export function getRecordDateKey(record: InspectionRecord) {
  const match = /^(\d{4})[/.\-年](\d{1,2})[/.\-月](\d{1,2})/.exec(record.date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return `${match[1]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function groupHistoryRecordsByDate(records: InspectionRecord[]) {
  const groups = new Map<string, InspectionRecord[]>();
  for (const record of records) {
    const date = getRecordDateKey(record);
    if (!date) continue;
    groups.set(date, [...(groups.get(date) ?? []), record]);
  }
  return groups;
}

export function getLatestHistoryDate(records: InspectionRecord[]) {
  const dates = records.map(getRecordDateKey).filter((date): date is string => date !== null);
  return dates.length ? dates.sort().at(-1)! : null;
}

export function getEarliestHistoryDate(records: InspectionRecord[]) {
  const dates = records.map(getRecordDateKey).filter((date): date is string => date !== null);
  return dates.length ? dates.sort()[0] : null;
}

export function getCalendarDates(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day < 1 || day > daysInMonth
      ? null
      : `${monthKey}-${String(day).padStart(2, "0")}`;
  });
}

export function shiftHistoryMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}
