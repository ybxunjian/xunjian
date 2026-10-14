import test from "node:test";
import assert from "node:assert/strict";
import { getHistoryMenuPaths } from "../src/features/inspection/components/history/history-menu-paths.ts";

const paths = (state) => getHistoryMenuPaths({ open: false, manageHistory: false, showBack: false, ...state })
  .map((path) => path.match(/-?\d+(?:\.\d+)?/g).map(Number));
const interpolate = (a, b, p) => a.map((value, i) => value + (b[i] - value) * p);
const length = ([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1);

test("hamburger and cross morph symmetrically without collapsing either outer line", () => {
  const closed = paths({});
  const open = paths({ open: true });
  for (const [from, to] of [[closed, open], [open, closed]]) {
    for (let step = 0; step <= 100; step++) {
      const upper = interpolate(from[0], to[0], step / 100);
      const lower = interpolate(from[1], to[1], step / 100);
      assert.ok(Math.abs(upper[0] - lower[0]) < 1e-9);
      assert.ok(Math.abs(upper[2] - lower[2]) < 1e-9);
      assert.ok(Math.abs(upper[1] + lower[1] - 28) < 1e-9);
      assert.ok(Math.abs(upper[3] + lower[3] - 28) < 1e-9);
      assert.ok(length(upper) >= 23.5);
      assert.ok(length(lower) >= 23.5);
    }
  }
});

test("cross, arrow, check and hamburger keep endpoint direction through every morph", () => {
  const shapes = [{}, { open: true }, { showBack: true }, { manageHistory: true }].map(paths);
  for (const from of shapes) for (const to of shapes) {
    for (let line = 0; line < 2; line++) for (let step = 0; step <= 100; step++) {
      const coordinates = interpolate(from[line], to[line], step / 100);
      assert.ok(coordinates[2] - coordinates[0] >= 8);
      assert.ok(length(coordinates) >= 8);
    }
  }
});
