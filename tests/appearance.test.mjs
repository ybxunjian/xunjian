import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { APPEARANCE_INIT_SCRIPT, normalizeAppearance, resolveAppearance } from "../src/lib/appearance.ts";

test("appearance preference keeps system distinct from its current resolution", () => {
  assert.equal(normalizeAppearance(null), "system");
  assert.equal(normalizeAppearance("obsolete"), "system");
  assert.equal(resolveAppearance("system", true), "dark");
  assert.equal(resolveAppearance("system", false), "light");
  assert.equal(resolveAppearance("light", true), "light");
  assert.equal(resolveAppearance("dark", false), "dark");
});

test("prepaint script applies saved overrides and follows the system with blocked storage", () => {
  for (const [saved, systemDark, expected] of [["light", true, "light"], ["dark", false, "dark"], ["old", true, "dark"], [null, false, "light"], ["blocked", true, "dark"]]) {
    const root = { dataset: {} };
    vm.runInNewContext(APPEARANCE_INIT_SCRIPT, {
      document: { documentElement: root },
      localStorage: { getItem() { if (saved === "blocked") throw new Error("blocked"); return saved; } },
      matchMedia() { return { matches: systemDark }; },
    });
    assert.equal(root.dataset.theme, expected);
    assert.equal(root.dataset.appearance, normalizeAppearance(saved));
  }
});

function luminance(hex) {
  const rgb = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test("dark semantic text, action and control colors meet contrast targets", () => {
  const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  const values = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map((match) => [match[1], match[2]]));
  const light = values(css.match(/:root\s*\{([^}]+)\}/s)[1]);
  const dark = { ...light, ...values(css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/s)[1]) };
  const increased = css.slice(css.indexOf("@media (prefers-contrast: more)"), css.indexOf("@theme inline"));
  const darkMore = { ...dark, ...values(increased.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/s)[1]) };
  for (const [name, palette] of Object.entries({ dark, darkMore })) {
    for (const foreground of ["foreground", "muted-foreground", "subtle-foreground"]) {
      for (const background of ["background", "card", "muted", "surface-elevated"]) {
        const ratio = contrast(palette[foreground], palette[background]);
        assert.ok(ratio >= 4.5, `${name} ${foreground}/${background}: ${ratio.toFixed(2)}`);
      }
    }
    for (const [foreground, background] of [["primary", "secondary"], ["primary-foreground", "primary-surface"], ["destructive-foreground", "destructive-surface"], ["destructive", "destructive-soft"], ["success", "success-soft"], ["warning", "warning-soft"], ["navigation-foreground", "navigation-selection"], ["navigation-muted", "navigation-track"]]) {
      const ratio = contrast(palette[foreground], palette[background]);
      assert.ok(ratio >= 4.5, `${name} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
    assert.ok(contrast(palette["control-border"], palette.card) >= 3, `${name} input boundary`);
    assert.notEqual(palette.background, palette.card);
    if (name.startsWith("dark")) assert.notEqual(palette.card, palette["surface-elevated"]);
  }
});
