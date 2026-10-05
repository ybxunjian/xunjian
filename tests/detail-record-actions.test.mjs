import assert from "node:assert/strict";
import test from "node:test";
import { mix } from "framer-motion";
import { DETAIL_ACTION_WIDTHS } from "../src/features/inspection/components/history/detail-record-actions.tsx";

function pixels(value, width) {
  const calc = value.match(/^calc\((-?[\d.]+)% \+ (-?[\d.]+)px\)$/);
  if (calc) return Number(calc[1]) * width / 100 + Number(calc[2]);
  return Number.parseFloat(value);
}

test("detail confirmation keeps an 8px gap throughout expansion and reversal", () => {
  for (const width of [288, 358, 416]) {
    for (const [from, to] of [
      [DETAIL_ACTION_WIDTHS.closed, DETAIL_ACTION_WIDTHS.open],
      [DETAIL_ACTION_WIDTHS.open, DETAIL_ACTION_WIDTHS.closed],
    ]) {
      const left = mix(from.left, to.left);
      const right = mix(from.right, to.right);
      for (const progress of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
        const leftWidth = pixels(left(progress), width);
        const rightWidth = pixels(right(progress), width);
        assert.ok(Math.abs(width - leftWidth - rightWidth - 8) < 0.001);
        assert.ok(leftWidth >= 48 && rightWidth >= 48);
      }
      // A px/calc mismatch jumps straight to the target instead of expanding.
      assert.notEqual(right(0.5), right(1));
    }
  }
});
