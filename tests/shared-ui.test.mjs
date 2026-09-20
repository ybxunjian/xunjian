import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TextField } from "../src/components/ui/text-field.tsx";
import { Sheet } from "../src/components/ui/sheet.tsx";
import { CredentialForm } from "../src/features/auth/components/credential-form.tsx";
import { AccountPasswordSheet } from "../src/features/account/components/account-password-sheet.tsx";
import { InspectionTabs } from "../src/features/inspection/components/inspection-tabs.tsx";
import { BeltTabs } from "../src/features/inspection/components/belt/belt-tabs.tsx";
import { cn } from "../src/lib/utils.ts";

test("custom type scales survive class merging with text colors", () => {
  assert.equal(
    cn("block text-caption font-semibold text-destructive"),
    "block text-caption font-semibold text-destructive",
  );
  assert.equal(
    cn("text-muted-foreground", "mt-2 text-caption"),
    "text-muted-foreground mt-2 text-caption",
  );
});

test("field errors retain help associations and label the invalid input", () => {
  const html = renderToStaticMarkup(h(TextField, {
    id: "password", label: "密码", icon: h("span"), error: "请填写密码",
    "aria-describedby": "password-help", shakeKey: 2,
  }));
  assert.match(html, /for="password"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="password-help password-error"/);
  assert.match(html, /id="password-error" role="alert"/);
});

test("primary navigation and belt tabs remain separate component groups", () => {
  const nav = renderToStaticMarkup(h(InspectionTabs, {
    order: ["slag8", "belt", "slag9", "history"], value: "belt", onChange() {},
  }));
  const filter = renderToStaticMarkup(h(BeltTabs, { value: "SZ201", onChange() {} }));
  assert.equal((nav.match(/<button/g) ?? []).length, 4);
  assert.equal((filter.match(/<button/g) ?? []).length, 3);
  assert.match(nav, /grid-cols-4/);
  assert.match(nav, /bg-primary text-primary-foreground/);
  assert.match(filter, /grid-cols-3 gap-1/);
  assert.match(filter, /bg-card text-primary/);
  assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  assert.doesNotMatch(nav, /aria-pressed/);
  assert.match(filter, /role="group"/);
  assert.equal((filter.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((filter.match(/aria-pressed="false"/g) ?? []).length, 2);
});

test("nested sheets keep confirmation outside the parent scrolling dialog", () => {
  const html = renderToStaticMarkup(h(Sheet, {
    labelledBy: "parent", onClose() {}, children: h("h3", { id: "parent" }, "账号"),
    overlays: h(Sheet, { labelledBy: "child", onClose() {}, nested: true, role: "alertdialog", children: h("h3", { id: "child" }, "确认") }),
  }));
  assert.equal((html.match(/aria-modal="true"/g) ?? []).length, 2);
  assert.match(html, /<\/h3><\/div><div[^>]*z-\[60\]/);
  assert.match(html, /role="alertdialog"/);
});

test("credential forms disable submit during pending requests and show one error alert", () => {
  const html = renderToStaticMarkup(h(CredentialForm, {
    disabled: true, submitting: true, submitLabel: "保存", error: "请求失败", onSubmit() {}, children: h("input"),
  }));
  assert.match(html, /type="submit"[^>]*disabled/);
  assert.match(html, /请稍候…/);
  assert.equal((html.match(/role="alert"/g) ?? []).length, 1);
});

test("password sheet keeps all three password fields inside one shared form", () => {
  const html = renderToStaticMarkup(h(AccountPasswordSheet, { onChangePassword: async () => {}, onClose() {} }));
  assert.equal((html.match(/<form/g) ?? []).length, 1);
  assert.equal((html.match(/type="password"/g) ?? []).length, 3);
  assert.equal((html.match(/type="submit"/g) ?? []).length, 1);
  assert.match(html, /aria-labelledby="password-dialog-title"/);
});
