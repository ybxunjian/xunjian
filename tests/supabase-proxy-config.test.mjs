import assert from "node:assert/strict";
import test from "node:test";
import { resolveSupabaseConnection } from "../src/lib/supabase/proxy-config.ts";

const canonical = "https://spixauhqjkqdoirulexb.supabase.co";
const proxy = "https://supabase-proxy.1925280604-b01.workers.dev";

test("keeps the original URL and SDK auth storage behavior by default", () => {
  assert.deepEqual(resolveSupabaseConnection(canonical), { url: canonical });
  assert.deepEqual(resolveSupabaseConnection(canonical, ""), { url: canonical });
});

test("selects the proxy without changing existing auth storage key", () => {
  assert.deepEqual(resolveSupabaseConnection(canonical, proxy), {
    url: proxy,
    authStorageKey: "sb-spixauhqjkqdoirulexb-auth-token",
  });
});

test("refuses invalid or non-HTTPS proxy endpoints", () => {
  for (const bad of [
    "http://proxy.example.com",
    "https://proxy.example.com/path",
    "https://proxy.example.com/?key=value",
    "https://user:password@proxy.example.com",
    "not-a-url",
  ]) {
    assert.deepEqual(resolveSupabaseConnection(canonical, bad), { url: canonical });
  }
});
