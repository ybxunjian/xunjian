import assert from "node:assert/strict";
import test from "node:test";
import { registerReloadGuard } from "../src/lib/page-reload-guard.ts";
import { watchServiceWorkerUpdates } from "../src/lib/service-worker-updates.ts";

function fixture({ controlled = true, waiting = true } = {}) {
  const worker = Object.assign(new EventTarget(), { messages: [], postMessage(message) { this.messages.push(message); } });
  const registration = Object.assign(new EventTarget(), { waiting: waiting ? worker : null, installing: null });
  const container = Object.assign(new EventTarget(), { controller: controlled ? {} : null });
  let apply;
  const calls = { available: 0, blocked: 0, failed: 0, reload: 0 };
  const stop = watchServiceWorkerUpdates(registration, container, {
    available: callback => { apply = callback; calls.available++; },
    blocked: () => calls.blocked++, failed: () => calls.failed++, reload: () => calls.reload++,
  });
  return { registration, container, worker, calls, apply: () => apply?.(), stop };
}

test("first install stays silent; a waiting upgrade requires explicit acceptance", () => {
  const first = fixture({ controlled: false });
  assert.equal(first.calls.available, 0);
  first.container.dispatchEvent(new Event("controllerchange"));
  assert.equal(first.calls.reload, 0);
  first.stop();
  const update = fixture();
  try {
    assert.equal(update.calls.available, 1);
    assert.deepEqual(update.worker.messages, []);
    update.apply();
    update.apply();
    assert.deepEqual(update.worker.messages, [{ type: "ACTIVATE_UPDATE" }]);
    update.container.dispatchEvent(new Event("controllerchange"));
    assert.equal(update.calls.reload, 1);
    update.container.dispatchEvent(new Event("controllerchange"));
    assert.equal(update.calls.reload, 1);
  } finally { update.stop(); }
});

test("storage failure blocks activation; editing during activation blocks reload", () => {
  let saved = false;
  const unregister = registerReloadGuard(() => saved);
  const update = fixture();
  try {
    update.apply();
    assert.equal(update.calls.blocked, 1);
    assert.deepEqual(update.worker.messages, []);
    saved = true;
    update.apply();
    saved = false;
    update.container.dispatchEvent(new Event("controllerchange"));
    assert.equal(update.calls.reload, 0);
    assert.equal(update.calls.blocked, 2);
  } finally { unregister(); update.stop(); }
});

test("a delayed installed worker is observed, and unmount removes all listeners", () => {
  const update = fixture({ waiting: false });
  update.registration.installing = update.worker;
  update.registration.dispatchEvent(new Event("updatefound"));
  update.registration.waiting = update.worker;
  update.worker.dispatchEvent(new Event("statechange"));
  assert.equal(update.calls.available, 1);
  update.stop();
  update.worker.dispatchEvent(new Event("statechange"));
  update.apply();
  assert.equal(update.calls.available, 1);
  assert.deepEqual(update.worker.messages, []);
});
