import { readFile } from "node:fs/promises";
import { test, expect, openApp, history, waitingUpdate } from "./fixtures";

test("draft editing survives reload and saved detail returns to history", async ({ page }) => {
  await openApp(page);
  const field = page.locator('input[inputmode="numeric"]').first();
  await expect(field).toBeVisible();
  await field.fill("28");
  await page.reload();
  await expect(field).toHaveValue("28");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "仍然保存" }).click();
  await expect(page.getByRole("button", { name: /查看.*巡检详情/ })).toHaveCount(2);
  await page.getByRole("button", { name: /查看.*巡检详情/ }).first().click();
  await expect(page.getByRole("heading", { name: "巡检汇总" })).toBeVisible();
  await page.getByRole("button", { name: "返回历史记录", exact: true }).click();
  await expect(page.getByRole("button", { name: /查看.*巡检详情/ })).toHaveCount(2);
});

for (const reduced of [false, true]) test(`menu edge taps and reversal (${reduced ? "reduced" : "normal"} motion)`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await history(page);
  const toggle = page.locator('button[aria-controls="history-quick-menu-actions"]').last();
  for (const position of [{ x: 1, y: 1 }, { x: 43, y: 1 }, { x: 1, y: 43 }, { x: 43, y: 43 }]) {
    await toggle.click({ position });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.click({ position });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }
  // A press beginning outside but resolving as a button click must toggle only once.
  await page.evaluate(() => {
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    document.querySelector<HTMLButtonElement>('button[aria-controls="history-quick-menu-actions"]')?.click();
  });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await toggle.press("Enter");
  await page.getByRole("button", { name: "巡检日历", exact: true }).click();
  await expect(page.getByRole("button", { name: "返回历史记录", exact: true })).toBeVisible();
});

test("password expansion preserves preferences, focus ring and theme keyboard access", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "打开账号", exact: true }).click();
  await page.getByRole("button", { name: "修改密码", exact: true }).click();
  const input = page.locator("#account-current-password");
  await expect(input).toBeVisible();
  await input.focus();
  expect(await input.evaluate(e => getComputedStyle(e.closest("#account-password-form")!).clipPath)).toBe("inset(-4px 0px 0px)");
  const dark = page.getByRole("button", { name: "深色", exact: true });
  await dark.scrollIntoViewIfNeeded();
  await dark.focus();
  await dark.press("Enter");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Escape");
  await expect(input).toHaveCount(0);
  await expect(page.getByRole("group", { name: "界面外观" })).toBeVisible();
});

test("corrupt history is preserved and exportable, and retry never clears it", async ({ page }) => {
  await openApp(page, '{"broken":');
  await expect(page.getByRole("heading", { name: "本地数据读取异常" })).toBeVisible();
  await expect(page.getByText("暂无历史记录")).toHaveCount(0);
  await page.getByRole("button", { name: "重试", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("night-inspection"))).toBe('{"broken":');
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出原始数据" }).click();
  const download = await downloadPromise;
  const recovery = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(recovery.raw["night-inspection"]).toBe('{"broken":');
});

test("quota failure rolls back cache, exports last input and retries saving it", async ({ page }) => {
  await openApp(page);
  const field = page.locator('input[inputmode="numeric"]').first();
  await field.fill("11");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("night-inspection-draft"))).toContain("11");
  const before = await page.evaluate(() => localStorage.getItem("night-inspection-draft"));
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    (window as Window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("night-inspection-account:")) throw new DOMException("full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await field.fill("88");
  await expect(page.getByRole("heading", { name: "本机保存暂未完成" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("night-inspection-draft"))).toBe(before);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出原始数据" }).click();
  const data = JSON.parse(await readFile((await (await downloadPromise).path())!, "utf8"));
  expect(Object.values(data.unsavedDraft.values)).toContain("88");
  await page.evaluate(() => (window as Window & { restoreStorage?: () => void }).restoreStorage?.());
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(field).toHaveValue("88");
});

test("waiting update prompts once and preserves draft through activation and reload", async ({ page }) => {
  await openApp(page);
  await page.locator('input[inputmode="numeric"]').first().fill("37");
  await expect(page.getByText("发现新版本", { exact: true })).toHaveCount(0);
  await waitingUpdate(page);
  await page.getByRole("button", { name: "更新", exact: true }).click();
  await page.waitForEvent("load");
  await expect(page.locator('input[inputmode="numeric"]').first()).toHaveValue("37");
  await page.context().setOffline(true);
  await page.reload();
  await expect(page.locator('input[inputmode="numeric"]').first()).toHaveValue("37");
});

test("storage failure prevents a waiting worker from activating or refreshing", async ({ page }) => {
  await openApp(page);
  await waitingUpdate(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "night-inspection-draft") throw new DOMException("full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await page.locator('input[inputmode="numeric"]').first().fill("60");
  await expect(page.getByRole("heading", { name: "本机保存暂未完成" })).toBeVisible();
  await page.getByRole("button", { name: "更新", exact: true }).click();
  await expect(page.getByText("暂时无法安全更新", { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
});

test("unavailable storage shows recovery instead of empty history and can be retried", async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("storage-read-fault-cleared")) return;
    const read = Storage.prototype.getItem;
    (window as Window & { restoreStorage?: () => void }).restoreStorage = () => { Storage.prototype.getItem = read; };
    Storage.prototype.getItem = function(key) {
      if (key === "night-inspection") throw new DOMException("blocked", "SecurityError");
      return read.call(this, key);
    };
  });
  await openApp(page);
  await expect(page.getByRole("heading", { name: "本机保存暂未完成" })).toBeVisible();
  await expect(page.getByText("暂无历史记录")).toHaveCount(0);
  await page.evaluate(() => (window as Window & { restoreStorage?: () => void }).restoreStorage?.());
  // A reload re-runs init scripts; disarm this injected fault before testing retry.
  await page.evaluate(() => sessionStorage.setItem("storage-read-fault-cleared", "yes"));
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.locator('input[inputmode="numeric"]').first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("night-inspection")!).length)).toBe(1);
});

test("a record write failure cannot report a successful save", async ({ page }) => {
  await openApp(page);
  const before = await page.evaluate(() => localStorage.getItem("night-inspection"));
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "night-inspection") throw new DOMException("full", "QuotaExceededError");
      return write.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.getByRole("button", { name: "仍然保存" }).click();
  await expect(page.getByRole("heading", { name: "本机保存暂未完成" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("night-inspection"))).toBe(before);
  await expect(page.getByText("本次巡检已保存", { exact: true })).toHaveCount(0);
});
