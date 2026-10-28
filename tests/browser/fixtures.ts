import { test as base, expect, type Page } from "@playwright/test";

export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const RECORD = { id: "00000000-0000-4000-8000-000000000002", date: "2026-10-24", time: "2026-10-24 20:50",
  createdAt: "2026-10-24T12:50:00.000Z", values: {} };

export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await use(errors);
    expect(errors).toEqual([]);
  }, { auto: true }],
});
export { expect };

/** The real app and SDK run normally; all cloud I/O is fulfilled locally by the test. */
export async function openApp(page: Page, rawRecords = JSON.stringify([RECORD])) {
  let rows = [{ id: RECORD.id, user_id: USER_ID, inspection_date: RECORD.date, inspection_time: RECORD.time,
    recorded_at: RECORD.createdAt, created_at: RECORD.createdAt, updated_at: RECORD.createdAt, deleted_at: null, values: {} }];
  let draft: unknown = null;
  await page.route("https://browser-test.supabase.invalid/**", async route => {
    const request = route.request(), url = new URL(request.url());
    let result: unknown = null;
    if (url.pathname.includes("inspection_records")) {
      if (request.method() === "GET") result = rows;
      else if (request.method() === "POST") {
        const added = request.postDataJSON();
        for (const row of Array.isArray(added) ? added : [added]) {
          rows = [...rows.filter(existing => existing.id !== row.id), { ...row, created_at: RECORD.createdAt, updated_at: RECORD.createdAt, deleted_at: null }];
        }
      }
    } else if (url.pathname.includes("upsert_inspection_draft_if_newer")) {
      const body = request.postDataJSON();
      draft = { user_id: USER_ID, values: body.p_values, belt_tab: body.p_belt_tab, updated_at: body.p_updated_at };
      result = true;
    } else if (url.pathname.includes("inspection_drafts")) result = draft;
    await route.fulfill({ status: 200, json: result, headers: { "Access-Control-Allow-Origin": "*" } });
  });
  await page.routeWebSocket("wss://browser-test.supabase.invalid/**", socket => socket.close());
  await page.addInitScript(({ userId, records }) => {
    if (sessionStorage.getItem("browser-fixture-seeded")) return;
    sessionStorage.setItem("browser-fixture-seeded", "yes");
    const now = Math.floor(Date.now() / 1000);
    const payload = { sub: userId, role: "authenticated", aud: "authenticated", exp: now + 86400, iat: now, session_id: "test-session" };
    const encode = (value: unknown) => btoa(JSON.stringify(value)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.test-signature`;
    localStorage.setItem("sb-browser-test-auth-token", JSON.stringify({ access_token: token, refresh_token: "fake-refresh",
      expires_at: payload.exp, expires_in: 86400, token_type: "bearer", user: { id: userId, email: "inspection@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "2026-01-01T00:00:00Z" } }));
    localStorage.setItem("night-inspection", records);
  }, { userId: USER_ID, records: rawRecords });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "云速巡检", exact: true })).toBeVisible();
}

export async function history(page: Page) {
  await page.getByRole("button", { name: "历史记录", exact: true }).click();
  await expect(page.getByRole("button", { name: "展开管理菜单" })).toBeVisible();
}

export async function waitingUpdate(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.request.post("/__test__/next-worker");
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration?.update(); });
  await expect(page.getByText("发现新版本", { exact: true })).toBeVisible();
}
