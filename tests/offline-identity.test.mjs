import assert from "node:assert/strict";
import test from "node:test";
import {
  clearOfflineIdentity,
  isRetryableAuthFailure,
  loadOfflineIdentity,
  saveOfflineIdentity,
} from "../src/features/auth/storage/offline-identity.ts";

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};

test.beforeEach(() => values.clear());

test("offline identity stores only account identity and explicit logout clears it", () => {
  saveOfflineIdentity({
    id: "account-a",
    email: "a@example.com",
    email_confirmed_at: "2026-09-01T00:00:00Z",
    access_token: "should-not-be-saved",
  });
  assert.deepEqual(loadOfflineIdentity(), {
    id: "account-a",
    email: "a@example.com",
    email_confirmed_at: "2026-09-01T00:00:00Z",
  });
  assert.doesNotMatch([...values.values()][0], /access_token/);
  clearOfflineIdentity();
  assert.equal(loadOfflineIdentity(), null);
});

test("invalid identity cannot open a cached account", () => {
  localStorage.setItem("night-inspection-offline-identity", '{"email":"a@example.com"}');
  assert.equal(loadOfflineIdentity(), null);
  localStorage.setItem("night-inspection-offline-identity", "{");
  assert.equal(loadOfflineIdentity(), null);
});

test("only a retryable auth fetch failure permits offline fallback", () => {
  const retryable = new Error("offline");
  retryable.name = "AuthRetryableFetchError";
  assert.equal(isRetryableAuthFailure(retryable), true);
  assert.equal(isRetryableAuthFailure(new Error("invalid token")), false);
});
