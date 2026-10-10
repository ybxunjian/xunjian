import assert from "node:assert/strict";
import test from "node:test";
import {
  getCalendarDates,
  getEarliestHistoryDate,
  getLatestHistoryDate,
  groupHistoryRecordsByDate,
  shiftHistoryMonth,
} from "../src/features/inspection/model/history-filter.ts";

const records = [
  { id: "new", date: "2026/9/25", time: "2026/9/25 20:54:50", values: {} },
  { id: "same-day", date: "2026-09-25", time: "2026/9/25 21:02:00", values: {} },
  { id: "old", date: "2026/8/31", time: "2026/8/31 20:34:38", values: {} },
];

test("calendar groups inspections by actual day and opens on the newest record", () => {
  const grouped = groupHistoryRecordsByDate(records);
  assert.deepEqual(grouped.get("2026-09-25")?.map((record) => record.id), ["new", "same-day"]);
  assert.equal(getLatestHistoryDate(records), "2026-09-25");
  assert.equal(getEarliestHistoryDate(records), "2026-08-31");
  assert.equal(grouped.get("2026-08-31")?.length, 1);
});

test("calendar aligns Monday first and crosses year boundaries", () => {
  const dates = getCalendarDates("2026-09");
  assert.equal(dates[0], null);
  assert.equal(dates[1], "2026-09-01");
  assert.equal(dates.at(-1), null);
  assert.equal(shiftHistoryMonth("2026-01", -1), "2025-12");
  assert.equal(shiftHistoryMonth("2026-12", 1), "2027-01");
});
