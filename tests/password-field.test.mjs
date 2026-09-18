import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordField } from "../src/features/auth/components/password-field.tsx";

test("renders a native password input and an accessible toggle", () => {
  const html = renderToStaticMarkup(createElement(PasswordField, {
    id: "password", label: "密码", autoComplete: "current-password",
  }));
  assert.match(html, /type="password"/);
  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /aria-label="显示密码"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /autoComplete="current-password"/);
});

// Architecture guards, not a substitute for browser / iPhone tests.
test("toggle keeps one input mounted and does not repair focus after blur", () => {
  const source = readFileSync(new URL("../src/features/auth/components/password-field.tsx", import.meta.url), "utf8");
  assert.match(source, /type=\{visible \? "text" : "password"\}/);
  assert.doesNotMatch(source, /\.focus\(|\.blur\(|setSelectionRange|selectionStart|scrollTo\(|key=\{/);
  assert.match(source, /onPointerDown=\{preserveActiveInput\}/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /onClick=\{toggleVisibility\}/);
  assert.match(source, /\[0, -6, 6, -4, 4, 0\]/);
  assert.doesNotMatch(source, /WebkitTextSecurity|-webkit-text-security|requestAnimationFrame|setTimeout/);
});
