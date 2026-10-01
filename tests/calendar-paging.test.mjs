import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarMonthDistance, clampCalendarDrag, getCalendarTarget, getCalendarSpringVelocity,
  CALENDAR_SPRING_STIFFNESS,
} from "../src/features/inspection/model/calendar-paging.ts";

test("calendar coordinates stay stable across years and month window changes", () => {
  assert.equal(calendarMonthDistance("2026-09", "2027-01"), 4);
  assert.equal(calendarMonthDistance("2026-09", "2025-12"), -9);
});

test("slow releases use the nearest page; fast flicks can advance before halfway", () => {
  assert.equal(getCalendarTarget(0.49, 0, 0, 0.1, -20), 0);
  assert.equal(getCalendarTarget(0.51, 0, 0, 0.1, -20), 1);
  assert.equal(getCalendarTarget(0.18, 0, 0, 1, -20), 1);
  assert.equal(getCalendarTarget(-0.18, 0, 0, -1, -20), -1);
});

test("a gesture caught near the previous target advances without finishing the old settle", () => {
  assert.equal(getCalendarTarget(1.05, 0.9, 1, 1.2, -20), 2);
  assert.equal(getCalendarTarget(-1.05, -0.9, -1, -1.2, -20), -2);
  assert.equal(getCalendarTarget(0.72, 0.9, 1, -1.2, -20), 0);
});

test("reversing within a gesture returns toward the crossed boundary", () => {
  assert.equal(getCalendarTarget(0.65, 0, 0, -1, -20), 0);
  assert.equal(getCalendarTarget(-0.65, 0, 0, 1, -20), 0);
});

test("each gesture is bounded to one month from takeover and respects earliest records", () => {
  assert.equal(clampCalendarDrag(10, 2, -20), 3);
  assert.equal(clampCalendarDrag(-10, 2, -20), 1);
  assert.equal(clampCalendarDrag(-0.6, 0, 0), 0);
  assert.equal(getCalendarTarget(-0.3, 0, 0, -8, 0), 0);
  assert.equal(getCalendarTarget(3, 2, 2, 80, -20), 3);
});

test("settling preserves forward velocity without overshooting or first moving backwards", () => {
  assert.equal(getCalendarSpringVelocity(0.8, 1, -2), 0);
  assert.equal(getCalendarSpringVelocity(0.8, 1, 1), 1);
  assert.equal(getCalendarSpringVelocity(0.99, 1, 80), Math.sqrt(CALENDAR_SPRING_STIFFNESS) * (1 - 0.99));
  assert.equal(getCalendarSpringVelocity(-0.99, -1, -80), -Math.sqrt(CALENDAR_SPRING_STIFFNESS) * (1 - 0.99));
  assert.equal(getCalendarSpringVelocity(1, 1, 80), 0);
});
