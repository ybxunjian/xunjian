import assert from "node:assert/strict";

function declarations(block) {
  return Object.fromEntries([...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)]
    .map((match) => [match[1], match[2].trim()]));
}

export function readAppearanceTokens(css) {
  // Token blocks contain color declarations; comments must not act as selectors or values.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, " ");
  const base = source.match(/:root\s*\{([^}]+)\}/s);
  const dark = source.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/s);
  const more = source.match(/@media\s*\(prefers-contrast:\s*more\)\s*\{\s*:root\[data-theme="dark"\]\s*\{([^}]+)\}/s);
  assert.ok(base && dark && more, "All three appearance token blocks must exist");
  const light = declarations(base[1]);
  const darkTokens = { ...light, ...declarations(dark[1]) };
  return { light, dark: darkTokens, darkMore: { ...darkTokens, ...declarations(more[1]) } };
}

/** Resolve after merging overrides, as CSS does; never fall back to an old literal. */
export function resolveHexColor(tokens, name, references = new Set()) {
  assert.ok(Object.hasOwn(tokens, name), `Missing color token: --${name}`);
  assert.ok(!references.has(name), `Circular color reference: --${name}`);
  const value = tokens[name].trim();
  const reference = value.match(/^var\(--([\w-]+)\)$/);
  if (reference) {
    return resolveHexColor(tokens, reference[1], new Set([...references, name]));
  }
  assert.match(value, /^#(?:[\da-f]{3}|[\da-f]{6})$/i, `Unsupported color value for --${name}: ${value}`);
  const hex = value.toLowerCase();
  return hex.length === 4 ? `#${[...hex.slice(1)].map((digit) => digit.repeat(2)).join("")}` : hex;
}
