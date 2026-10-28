import assert from "node:assert/strict";
import test from "node:test";

import {
  DRAFT_STORAGE_KEY,
  RECORDS_STORAGE_KEY,
  getStoredInspectionDraft,
  loadInspectionState,
  prepareStorageForUser,
  saveInspectionDraft,
  saveInspectionRecords,
  readInspectionRecoveryData,
} from "../src/features/inspection/storage/inspection-storage.ts";

class MemoryStorage {
  #values = new Map();

  clear() {
    this.#values.clear();
  }

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

globalThis.localStorage = new MemoryStorage();

test.beforeEach(() => localStorage.clear());

test("legacy values-only drafts remain readable", () => {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ legacy: "8" }));
  assert.deepEqual(loadInspectionState(), {
    records: [],
    values: { legacy: "8" },
    beltTab: "SZ101",
    draftUpdatedAt: null,
    hasDraft: true,
  });
});

test("stored draft conversion retains absence, legacy values and empty versions", () => {
  assert.equal(getStoredInspectionDraft(loadInspectionState()), null);
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ legacy: "8" }));
  assert.deepEqual(getStoredInspectionDraft(loadInspectionState()), {
    values: { legacy: "8" }, beltTab: "SZ101",
  });
  const empty = { values: {}, beltTab: "SZ201", updatedAt: "2026-09-09T00:00:00.000Z" };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(empty));
  assert.deepEqual(getStoredInspectionDraft(loadInspectionState()), empty);
});

test("an empty versioned draft is distinct from no draft", () => {
  localStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({
      values: {},
      beltTab: "SZ201-N",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }),
  );
  const state = loadInspectionState();
  assert.equal(state.hasDraft, true);
  assert.equal(state.beltTab, "SZ201-N");
  assert.equal(state.draftUpdatedAt, "2026-09-01T00:00:00.000Z");
});

test("invalid stored JSON is preserved and blocks loading and writes", () => {
  localStorage.setItem(DRAFT_STORAGE_KEY, "{");
  localStorage.setItem(
    RECORDS_STORAGE_KEY,
    JSON.stringify([
      {
        id: "record",
        date: "2026-09-01",
        time: "2026-09-01 01:00",
        values: {},
      },
    ]),
  );
  assert.throws(() => loadInspectionState(), { kind: "corrupt" });
  assert.throws(() => saveInspectionRecords([]), { kind: "corrupt" });
  assert.equal(localStorage.getItem(DRAFT_STORAGE_KEY), "{");
  assert.match(localStorage.getItem(RECORDS_STORAGE_KEY), /record/);
});

test("legacy account caches infer an empty versioned draft", () => {
  localStorage.setItem("night-inspection-owner", "first-user");
  localStorage.setItem(
    "night-inspection-account:second-user",
    JSON.stringify({
      records: [],
      values: {},
      beltTab: "SZ201",
      draftUpdatedAt: "2026-09-01T01:00:00.000Z",
    }),
  );

  const state = prepareStorageForUser("second-user");
  assert.equal(state.hasDraft, true);
  assert.equal(state.beltTab, "SZ201");
  assert.notEqual(localStorage.getItem(DRAFT_STORAGE_KEY), null);
});

const record = { id: "one", date: "2026-10-28", time: "20:30", values: {} };
const draft = { values: { temperature: "88" }, beltTab: "SZ201", updatedAt: "2026-10-28T12:00:00Z" };

test("an invalid row is not silently filtered out and then overwritten", () => {
  const original = JSON.stringify([record, { id: "broken" }]);
  localStorage.setItem(RECORDS_STORAGE_KEY, original);
  assert.throws(() => loadInspectionState(), { kind: "corrupt" });
  assert.throws(() => saveInspectionDraft(draft), { kind: "corrupt" });
  assert.equal(localStorage.getItem(RECORDS_STORAGE_KEY), original);
});

test("unavailable storage propagates a typed failure instead of an empty history", () => {
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new DOMException("blocked", "SecurityError"); } };
  try { assert.throws(() => loadInspectionState(), { kind: "unavailable" }); }
  finally { globalThis.localStorage = old; }
});

test("a cache write failure rolls back workspace strings exactly", () => {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([record]));
  prepareStorageForUser("owner");
  const oldDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
  const oldCache = localStorage.getItem("night-inspection-account:owner");
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    if (key === "night-inspection-account:owner") throw new DOMException("full", "QuotaExceededError");
    original(key, value);
  };
  try {
    assert.throws(() => saveInspectionDraft(draft, "owner"), { kind: "quota" });
    assert.equal(localStorage.getItem(DRAFT_STORAGE_KEY), oldDraft);
    assert.equal(localStorage.getItem("night-inspection-account:owner"), oldCache);
  } finally { localStorage.setItem = original; }
});

test("account switching cannot overwrite a corrupt target cache or leak the previous owner", () => {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([record]));
  prepareStorageForUser("first");
  localStorage.setItem("night-inspection-account:second", "{");
  const before = localStorage.getItem(RECORDS_STORAGE_KEY);
  assert.throws(() => prepareStorageForUser("second"), { kind: "corrupt" });
  assert.equal(localStorage.getItem("night-inspection-owner"), "first");
  assert.equal(localStorage.getItem(RECORDS_STORAGE_KEY), before);
  assert.deepEqual(readInspectionRecoveryData("second"), { "night-inspection-account:second": "{" });
});

test("a mid-switch failure preserves both account caches and the original owner", () => {
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([record]));
  prepareStorageForUser("first");
  const cache = localStorage.getItem("night-inspection-account:first");
  const original = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (key, value) => {
    if (key === "night-inspection-owner") throw new DOMException("full", "QuotaExceededError");
    original(key, value);
  };
  try {
    assert.throws(() => prepareStorageForUser("second"), { kind: "quota" });
    assert.equal(localStorage.getItem("night-inspection-owner"), "first");
    assert.equal(localStorage.getItem(RECORDS_STORAGE_KEY), JSON.stringify([record]));
    assert.equal(localStorage.getItem("night-inspection-account:first"), cache);
    assert.equal(localStorage.getItem("night-inspection-account:second"), null);
  } finally { localStorage.setItem = original; }
});

test("recovery export respects the original owner even if marker rollback failed", () => {
  localStorage.setItem("night-inspection-owner", "second");
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify([record]));
  localStorage.setItem("night-inspection-account:second", JSON.stringify({ records: [], values: {} }));
  const raw = readInspectionRecoveryData("second", { "night-inspection-owner": "first" });
  assert.deepEqual(Object.keys(raw), ["night-inspection-account:second"]);
});
