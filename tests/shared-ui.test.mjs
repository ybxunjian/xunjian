import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TextField } from "../src/components/ui/text-field.tsx";
import { Sheet } from "../src/components/ui/sheet.tsx";
import { CredentialForm } from "../src/features/auth/components/credential-form.tsx";
import { AccountPasswordForm } from "../src/features/account/components/account-password-form.tsx";
import { AccountPasswordControls } from "../src/features/account/components/account-password-controls.tsx";
import { InspectionTabs } from "../src/features/inspection/components/inspection-tabs.tsx";
import { BeltTabs } from "../src/features/inspection/components/belt/belt-tabs.tsx";
import { HistoryCalendar } from "../src/features/inspection/components/history/history-calendar.tsx";
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
  assert.match(html, /left-4 top-1\/2 z-10/);
});

test("primary navigation and belt tabs remain separate component groups", () => {
  const nav = renderToStaticMarkup(h(InspectionTabs, {
    order: ["slag8", "belt", "slag9", "history"], value: "belt", onChange() {},
  }));
  const filter = renderToStaticMarkup(h(BeltTabs, { value: "SZ201", onChange() {} }));
  assert.equal((nav.match(/<button/g) ?? []).length, 4);
  assert.equal((filter.match(/<button/g) ?? []).length, 3);
  assert.match(nav, /grid-cols-4/);
  assert.equal((nav.match(/data-navigation-indicator=""/g) ?? []).length, 1);
  assert.match(nav, /transform:translateX\(100%\)/);
  assert.doesNotMatch(nav, /<button[^>]*\bbg-primary\b/);
  assert.match(nav, /aria-current="page"[^>]*text-primary-foreground/);
  const reordered = renderToStaticMarkup(h(InspectionTabs, {
    order: ["history", "slag9", "slag8", "belt"], value: "belt", onChange() {},
  }));
  assert.match(reordered, /transform:translateX\(300%\)/);
  assert.match(filter, /grid-cols-3 gap-1/);
  assert.match(filter, /bg-card text-primary/);
  assert.equal((nav.match(/aria-current="page"/g) ?? []).length, 1);
  assert.doesNotMatch(nav, /aria-pressed/);
  assert.match(filter, /role="group"/);
  assert.equal((filter.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((filter.match(/aria-pressed="false"/g) ?? []).length, 2);
});

test("sheets preserve dialog semantics and heading associations", () => {
  const html = renderToStaticMarkup(h(Sheet, {
    labelledBy: "parent", onClose() {}, children: h("h3", { id: "parent" }, "账号"),
  }));
  assert.equal((html.match(/aria-modal="true"/g) ?? []).length, 1);
  assert.equal((html.match(/tabindex="-1"/g) ?? []).length, 1);
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-labelledby="parent"/);
  assert.match(html, /<h3 id="parent">账号<\/h3>/);
});

test("credential forms disable submit during pending requests and show one error alert", () => {
  const html = renderToStaticMarkup(h(CredentialForm, {
    disabled: true, submitting: true, submitLabel: "保存", error: "请求失败", onSubmit() {}, children: h("input"),
  }));
  assert.match(html, /type="submit"[^>]*disabled/);
  assert.match(html, /请稍候…/);
  assert.equal((html.match(/role="alert"/g) ?? []).length, 1);
});

test("inline password editor keeps three password fields inside one shared form", () => {
  const html = renderToStaticMarkup(h(AccountPasswordForm, { onChangePassword: async () => {}, onClose() {}, onBusyChange() {} }));
  assert.equal((html.match(/<form/g) ?? []).length, 1);
  assert.equal((html.match(/type="password"/g) ?? []).length, 3);
  assert.equal((html.match(/type="submit"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /role="dialog"|aria-modal/);
  assert.match(html, /type="button"[^>]*>取消<\/button>/);
  assert.doesNotMatch(html, /account-password-help/);
});


test("calendar adjacent pages stay out of focus and stop at the earliest record month", () => {
  const props = {
    records: [{ id: "old", date: "2026/8/31", values: {} }, { id: "new", date: "2026/9/25", values: {} }],
    month: "2026-09", onMonthChange() {}, onSelectRecord() {},
  };
  const html = renderToStaticMarkup(h(HistoryCalendar, props));
  assert.match(html, /data-calendar-month="2026-08" aria-hidden="true" inert=""/);
  assert.match(html, /data-calendar-month="2026-09" aria-hidden="false"/);
  assert.match(html, /data-calendar-month="2026-10" aria-hidden="true" inert=""/);
  assert.match(html, /data-calendar-month="2026-12" aria-hidden="true" inert=""/);
  assert.equal((html.match(/data-calendar-month=/g) ?? []).length, 5);
  const earliest = renderToStaticMarkup(h(HistoryCalendar, { ...props, month: "2026-08" }));
  assert.doesNotMatch(earliest, /data-calendar-month="2026-07"/);
  assert.doesNotMatch(earliest, /aria-label="上一个月"/);
  assert.match(earliest, /aria-label="下一个月"/);
});


test("inline password form disables cancellation and all inputs when unavailable", () => {
  const html = renderToStaticMarkup(h(AccountPasswordForm, {
    onChangePassword: async () => {}, onClose() {}, onBusyChange() {}, disabled: true,
  }));
  assert.equal((html.match(/<input[^>]*disabled/g) ?? []).length, 3);
  assert.match(html, /type="button"[^>]*disabled[^>]*>取消<\/button>/);
  assert.match(html, /type="submit"[^>]*disabled/);
});

test("password disclosure uses its original action tile without opening another dialog", () => {
  const props = { busy: false, disabled: false, onOpen() {}, onClose() {}, onCollapsed() {}, onBusyChange() {}, onChangePassword: async () => {} };
  const collapsed = renderToStaticMarkup(h(AccountPasswordControls, { ...props, open: false }));
  assert.match(collapsed, /aria-expanded="false"/);
  assert.doesNotMatch(collapsed, /<form/);
  const expanded = renderToStaticMarkup(h(AccountPasswordControls, { ...props, open: true }));
  assert.match(expanded, /aria-expanded="true" aria-controls="account-password-form"/);
  assert.match(expanded, /id="account-password-form" role="region"/);
  assert.equal((expanded.match(/<form/g) ?? []).length, 1);
  assert.doesNotMatch(expanded, /role="dialog"|aria-modal/);
});
