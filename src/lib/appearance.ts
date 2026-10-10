export type AppearancePreference = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

export const APPEARANCE_STORAGE_KEY = "night-inspection-appearance";
const APPEARANCE_EVENT = "night-inspection-appearance-change";

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

function applyAppearance(preference: AppearancePreference) {
  const root = document.documentElement;
  root.dataset.appearance = preference;
  root.dataset.theme = resolveAppearance(preference, matchMedia("(prefers-color-scheme: dark)").matches);
  // Keep the original light browser chrome hint; dark follows the page surface.
  const browserColor = getComputedStyle(root).getPropertyValue("--browser-theme-color").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", browserColor);
  });
}

export function setAppearancePreference(preference: AppearancePreference) {
  try { localStorage.setItem(APPEARANCE_STORAGE_KEY, preference); } catch { /* Keep this session usable. */ }
  applyAppearance(preference);
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

/** One browser subscription contract for controls, toast and resolved animation colors. */
export function subscribeAppearance(onChange: () => void) {
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  const contrast = matchMedia("(prefers-contrast: more)");
  const refresh = () => {
    applyAppearance(normalizeAppearance(document.documentElement.dataset.appearance));
    onChange();
  };
  const storage = (event: StorageEvent) => {
    if (event.key !== APPEARANCE_STORAGE_KEY && event.key !== null) return;
    applyAppearance(normalizeAppearance(event.newValue));
    onChange();
  };
  scheme.addEventListener("change", refresh);
  contrast.addEventListener("change", refresh);
  window.addEventListener("storage", storage);
  window.addEventListener(APPEARANCE_EVENT, refresh);
  refresh();
  return () => {
    scheme.removeEventListener("change", refresh);
    contrast.removeEventListener("change", refresh);
    window.removeEventListener("storage", storage);
    window.removeEventListener(APPEARANCE_EVENT, refresh);
  };
}
