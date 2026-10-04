import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryRecordDisplay } from "../src/features/inspection/model/history-record-display.ts";
const record = { id: "record", date: "2026/10/1", time: "2026/10/1 20:54:46", values: {} };

test("history display separates date and writing time without changing the record", () => {
  assert.deepEqual(getHistoryRecordDisplay(record), { date: "10/01", dateCaption: "2026年 · 周四", time: "20:54", timeCaption: "填写时间" });
  assert.equal(record.time, "2026/10/1 20:54:46");
  assert.equal(getHistoryRecordDisplay({ ...record, date: "2026-10-01", time: "8:05" }).time, "08:05");
});
test("history display identifies writing on another day or year", () => {
  assert.equal(getHistoryRecordDisplay({ ...record, time: "2026/10/2 00:15:00" }).timeCaption, "填写于 10月2日");
  assert.equal(getHistoryRecordDisplay({ ...record, time: "2027/1/1 00:15:00" }).timeCaption, "填写于 2027/1/1");
});
test("history display retains unrecognised legacy dates and writing times", () => {
  const legacy = getHistoryRecordDisplay({ ...record, date: "unknown", time: "unknown" });
  assert.equal(legacy.date, "unknown");
  assert.equal(legacy.time, "unknown");
  assert.equal(getHistoryRecordDisplay({ ...record, time: "2026/2/30 08:00" }).time, "2026/2/30 08:00");
  assert.equal(getHistoryRecordDisplay({ ...record, time: "25:70" }).time, "25:70");
});
test("ISO writing timestamps display local wall time with the correct date", () => {
  const iso = "2026-10-02T00:15:00Z";
  const expected = new Date(iso);
  const display = getHistoryRecordDisplay({ ...record, time: iso });
  assert.equal(display.time, `${String(expected.getHours()).padStart(2, "0")}:${String(expected.getMinutes()).padStart(2, "0")}`);
});
