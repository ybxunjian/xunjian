import assert from "node:assert/strict";
import test from "node:test";
import { deliverBackupFile } from "../src/features/inspection/storage/backup-file-delivery.ts";

test("cancelled native sharing must not silently download a recovery file", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    canShare: () => true, share: async () => { throw new DOMException("cancelled", "AbortError"); },
  } });
  try { assert.equal(await deliverBackupFile(new File(["{}"], "recovery.json")), "cancelled"); }
  finally { Object.defineProperty(globalThis, "navigator", descriptor); }
});

test("successful native sharing preserves the record count description", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let payload;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    canShare: () => true, share: async value => { payload = value; },
  } });
  try {
    const file = new File(["{}"], "records.json");
    assert.equal(await deliverBackupFile(file, "共 7 条历史记录"), "share");
    assert.deepEqual(payload.files, [file]);
    assert.equal(payload.text, "共 7 条历史记录");
  } finally { Object.defineProperty(globalThis, "navigator", descriptor); }
});
