import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { readAppearanceTokens, resolveHexColor } from "./helpers/appearance-palette.mjs";
import { APPEARANCE_INIT_SCRIPT, APPEARANCE_STORAGE_KEY, getAppearanceSnapshot, normalizeAppearance, resolveAppearance, setAppearancePreference, subscribeAppearance } from "../src/lib/appearance.ts";

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

test("appearance updates share listeners, synchronize consumers and survive rapid reversal and storage failure", () => {
  const keys = ["document", "window", "localStorage", "matchMedia", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"];
  const originals = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  class Media extends EventTarget {
    matches = false;
    count = 0;
    addEventListener(...args) { this.count++; super.addEventListener(...args); }
    removeEventListener(...args) { this.count--; super.removeEventListener(...args); }
    change(matches) { this.matches = matches; this.dispatchEvent(new Event("change")); }
  }
  const scheme = new Media();
  const increased = new Media();
  const root = { dataset: { appearance: "system", theme: "light" } };
  const windowTarget = new EventTarget();
  const frames = new Map();
  let frameId = 0;
  const paint = () => {
    for (const [id, callback] of [...frames]) { frames.delete(id); callback(); }
  };
  const observed = [];
  const disposers = [];
  Object.assign(globalThis, {
    document: { documentElement: root, querySelectorAll: () => [] },
    window: windowTarget,
    localStorage: { setItem() { throw new Error("blocked storage"); } },
    matchMedia: (query) => query.includes("color-scheme") ? scheme : increased,
    getComputedStyle: () => ({ getPropertyValue: () => "#111114" }),
    requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  try {
    for (let index = 0; index < 2; index++) {
      disposers.push(subscribeAppearance(() => observed.push([index, getAppearanceSnapshot(), "appearanceChanging" in root.dataset])));
    }
    assert.equal(scheme.count, 1);
    assert.equal(increased.count, 1);
    observed.length = 0;
    setAppearancePreference("dark");
    assert.deepEqual(observed, [[0, "dark:dark", true], [1, "dark:dark", true]]);
    paint();
    setAppearancePreference("light");
    paint();
    assert.ok("appearanceChanging" in root.dataset);
    paint();
    assert.ok(!("appearanceChanging" in root.dataset));

    scheme.change(true);
    assert.equal(getAppearanceSnapshot(), "light:light", "manual appearance overrides the system");
    assert.ok(!("appearanceChanging" in root.dataset));
    const unrelated = Object.assign(new Event("storage"), { key: "inspection-records", newValue: null });
    observed.length = 0;
    windowTarget.dispatchEvent(unrelated);
    assert.equal(observed.length, 0);
    windowTarget.dispatchEvent(Object.assign(new Event("storage"), { key: APPEARANCE_STORAGE_KEY, newValue: null }));
    assert.equal(getAppearanceSnapshot(), "system:dark", "removing a preference follows the current system");
    paint(); paint();
    increased.change(true);
    assert.ok("appearanceChanging" in root.dataset, "contrast changes also suppress mixed color transitions");
    paint(); paint();
    assert.ok(!("appearanceChanging" in root.dataset));
  } finally {
    for (const dispose of disposers) dispose();
    assert.equal(scheme.count, 0);
    assert.equal(increased.count, 0);
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
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
  const { dark, darkMore } = readAppearanceTokens(css);
  for (const [name, palette] of Object.entries({ dark, darkMore })) {
    const color = (token) => resolveHexColor(palette, token);
    for (const foreground of ["foreground", "muted-foreground", "subtle-foreground", "destructive"]) {
      for (const background of ["background", "card", "muted", "surface-elevated"]) {
        const ratio = contrast(color(foreground), color(background));
        assert.ok(ratio >= 4.5, `${name} ${foreground}/${background}: ${ratio.toFixed(2)}`);
      }
    }
    for (const [foreground, background] of [["primary", "secondary"], ["primary-foreground", "primary-surface"], ["destructive-foreground", "destructive-surface"], ["destructive", "destructive-soft"], ["success", "success-soft"], ["warning", "warning-soft"], ["navigation-foreground", "navigation-selection"], ["navigation-muted", "navigation-track"]]) {
      const ratio = contrast(color(foreground), color(background));
      assert.ok(ratio >= 4.5, `${name} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
    assert.ok(contrast(color("control-border"), color("card")) >= 3, `${name} input boundary`);
    assert.notEqual(color("background"), color("card"));
    assert.notEqual(color("card"), color("surface-elevated"));
  }
});

test("appearance color references resolve after theme and contrast overrides", () => {
  const palettes = readAppearanceTokens(`
    :root { --foreground: #123; --alias: var(--foreground); --nested: var(--alias); }
    :root[data-theme="dark"] { --foreground: #bebec8; }
    @media (prefers-contrast: more) {
      :root[data-theme="dark"] { --foreground: #ededf2; }
    }
  `);
  assert.equal(resolveHexColor(palettes.light, "nested"), "#112233");
  assert.equal(resolveHexColor(palettes.dark, "nested"), "#bebec8");
  assert.equal(resolveHexColor(palettes.darkMore, "nested"), "#ededf2");
});

test("commented theme blocks and inline comments do not change the effective palette", () => {
  const palettes = readAppearanceTokens(`
    /* :root { --foreground: #ffffff; } */
    :root { --foreground: #123; --alias: /* text alias */ var(--foreground); }
    /* :root[data-theme="dark"] { --foreground: #000000; } */
    :root[data-theme="dark"] {
      --foreground: #bebec8;
      /* Old example: { --foreground: #ffffff; } */
    }
    /* @media (prefers-contrast: more) {
      :root[data-theme="dark"] { --foreground: #000000; }
    } */
    @media /* increased contrast */ (prefers-contrast: more) {
      :root[data-theme="dark"] { --foreground: #ededf2; }
    }
  `);
  assert.equal(resolveHexColor(palettes.light, "alias"), "#112233");
  assert.equal(resolveHexColor(palettes.dark, "alias"), "#bebec8");
  assert.equal(resolveHexColor(palettes.darkMore, "alias"), "#ededf2");
});

test("a commented old color cannot hide a low-contrast active alias", () => {
  const { dark } = readAppearanceTokens(`
    :root { --foreground: #64748b; --navigation-muted: var(--foreground); }
    :root[data-theme="dark"] {
      --foreground: #28282e;
      --navigation-track: #28282e;
      --navigation-muted: var(--foreground);
      /* --navigation-muted: #bebec8; */
    }
    @media (prefers-contrast: more) {
      :root[data-theme="dark"] { --foreground: #ededf2; }
    }
  `);
  const text = resolveHexColor(dark, "navigation-muted");
  assert.equal(text, "#28282e");
  assert.equal(contrast(text, resolveHexColor(dark, "navigation-track")), 1);
});

test("invalid color references fail instead of silently testing another palette", () => {
  assert.throws(() => resolveHexColor({ alias: "var(--missing)" }, "alias"), /Missing color token/);
  assert.throws(() => resolveHexColor({ a: "var(--b)", b: "var(--a)" }, "a"), /Circular color reference/);
  assert.throws(() => resolveHexColor({ foreground: "invalid" }, "foreground"), /Unsupported color value/);
});
