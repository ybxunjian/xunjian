import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordField } from "../src/features/auth/components/password-field.tsx";

test("server markup fails closed before masking support is known", () => {
  const html = renderToStaticMarkup(createElement(PasswordField, {
    id: "password", label: "密码", autoComplete: "current-password",
  }));
  assert.match(html, /type="password"/);
  assert.match(html, /-webkit-text-security:disc/);
  assert.match(html, /<input[^>]*disabled=""/);
  assert.match(html, /<button[^>]*disabled=""/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /spellCheck="false"/);
});

// Architecture guards, not a substitute for browser / iPhone tests.
test("toggle cannot change type, restore focus or selection, or remount input", () => {
  const source = readFileSync(new URL("../src/features/auth/components/password-field.tsx", import.meta.url), "utf8");
  assert.match(source, /type=\{maskSupported \? "text" : "password"\}/);
  assert.match(source, /WebkitTextSecurity: visible \? "none" : "disc"/);
  assert.doesNotMatch(source, /\.focus\(|\.blur\(|setSelectionRange|selectionStart|scrollTo\(|key=\{/);
  assert.match(source, /onPointerDown=\{preserveActiveInput\}/);
  assert.match(source, /onMouseDown=\{/);
});
