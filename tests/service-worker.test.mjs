import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  normalizeBasePath,
  renderServiceWorker,
} from "../scripts/generate-service-worker.mjs";

const template = readFileSync(new URL("../scripts/service-worker-template.js", import.meta.url), "utf8");

test("worker uses the GitHub Pages scope and serves a cached shell offline", async () => {
  const handlers = {};
  const cachedShell = { source: "cached shell" };
  const cachedAsset = { source: "cached asset" };
  const matches = [];
  const source = renderServiceWorker(template, {
    basePath: "/xunjian",
    version: "test-version",
    files: ["index.html", "_next/static/app.js"],
  });
  const context = {
    URL,
    Response,
    Set,
    console,
    self: {
      location: { origin: "https://example.test" },
      clients: { claim: async () => {} },
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
    caches: {
      open: async () => ({
        addAll: async (assets) => {
          assert.deepEqual(Array.from(assets), ["/xunjian/index.html", "/xunjian/_next/static/app.js"]);
        },
      }),
      match: async (url) => {
        matches.push(url);
        if (url === "/xunjian/index.html") return cachedShell;
        if (url === "/xunjian/_next/static/app.js") return cachedAsset;
        return undefined;
      },
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async () => { throw new Error("offline"); },
  };
  vm.runInNewContext(source, context);
  let install;
  handlers.install({ waitUntil: (promise) => { install = promise; } });
  await install;

  const request = (url, mode = "navigate") => ({ method: "GET", url, mode });
  const respond = (req) => {
    let response;
    handlers.fetch({ request: req, respondWith: (promise) => { response = promise; } });
    return response;
  };
  assert.equal(await respond(request("https://example.test/xunjian/")), cachedShell);
  assert.equal(await respond(request("https://example.test/xunjian/_next/static/app.js", "no-cors")), cachedAsset);
  assert.deepEqual(matches, ["/xunjian/index.html", "/xunjian/_next/static/app.js"]);
  assert.equal(respond(request("https://api.example.test/auth/v1/token", "cors")), undefined);
});

test("base path rejects malformed values", () => {
  assert.equal(normalizeBasePath(""), "");
  assert.equal(normalizeBasePath("/xunjian"), "/xunjian");
  assert.throws(() => normalizeBasePath("/xunjian/"));
});
