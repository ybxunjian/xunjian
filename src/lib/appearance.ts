export type AppearancePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export const APPEARANCE_STORAGE_KEY = "night-inspection-appearance";
const listeners = new Set<() => void>();
let stopListening: (() => void) | undefined;
let transitionFrame = 0;

export function normalizeAppearance(value: unknown): AppearancePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveAppearance(preference: AppearancePreference, systemDark: boolean): ColorScheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

// Runs synchronously in <head>, before content paint. Storage may be blocked.
export const APPEARANCE_INIT_SCRIPT = `(() => {
  const normalize = ${normalizeAppearance.toString()};
  const resolve = ${resolveAppearance.toString()};
  let preference = "system";
  try { preference = normalize(localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)})); } catch {}
  const root = document.documentElement;
  root.dataset.appearance = preference;
  root.dataset.theme = resolve(preference, matchMedia("(prefers-color-scheme: dark)").matches);
})();`;

export function getAppearanceSnapshot() {
  if (typeof document === "undefined") return "system:light";
  const root = document.documentElement;
  return `${normalizeAppearance(root.dataset.appearance)}:${root.dataset.theme === "dark" ? "dark" : "light"}`;
}

export function getServerAppearanceSnapshot() { return "system:light"; }

function finishAppearanceChangeAfterPaint() {
  cancelAnimationFrame(transitionFrame);
  // Keep color transitions excluded until the new palette has been painted.
  // A rapid reversal cancels the previous cleanup rather than releasing early.
  transitionFrame = requestAnimationFrame(() => {
    transitionFrame = requestAnimationFrame(() => {
      delete document.documentElement.dataset.appearanceChanging;
      transitionFrame = 0;
    });
  });
}

function applyAppearance(preference: AppearancePreference, contrastChanged = false) {
  const root = document.documentElement;
  const scheme = resolveAppearance(preference, matchMedia("(prefers-color-scheme: dark)").matches);
  if (root.dataset.theme !== scheme || contrastChanged) {
    root.dataset.appearanceChanging = "";
    finishAppearanceChangeAfterPaint();
  }
  root.dataset.appearance = preference;
  root.dataset.theme = scheme;
  // Keep the original light browser chrome hint; dark follows the page surface.
  const browserColor = getComputedStyle(root).getPropertyValue("--browser-theme-color").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", browserColor);
  });
}

function notifyAppearance() {
  // Subscribers may unsubscribe/re-subscribe during a synchronous React commit.
  for (const listener of [...listeners]) listener();
}

export function setAppearancePreference(preference: AppearancePreference) {
  try { localStorage.setItem(APPEARANCE_STORAGE_KEY, preference); } catch { /* Keep this session usable. */ }
  applyAppearance(preference);
  notifyAppearance();
}

/** One browser subscription contract for controls, toast and resolved animation colors. */
export function subscribeAppearance(onChange: () => void) {
  listeners.add(onChange);
  if (!stopListening) {
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const contrast = matchMedia("(prefers-contrast: more)");
    const refresh = () => {
      applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
      notifyAppearance();
    };
    const refreshContrast = () => {
      applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance), true);
      notifyAppearance();
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_STORAGE_KEY && event.key !== null) return;
      applyAppearance(normalizeAppearance(event.newValue));
      notifyAppearance();
    };
    scheme.addEventListener("change", refresh);
    contrast.addEventListener("change", refreshContrast);
    window.addEventListener("storage", storage);
    stopListening = () => {
      scheme.removeEventListener("change", refresh);
      contrast.removeEventListener("change", refreshContrast);
      window.removeEventListener("storage", storage);
    };
    applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
  }
  onChange();
  return () => {
    listeners.delete(onChange);
    if (!listeners.size) {
      stopListening?.();
      stopListening = undefined;
    }
  };
}
