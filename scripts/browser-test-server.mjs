// Test-only server: builds a static site with fake public settings, never real credentials.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const build = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  stdio: "inherit", env: { ...process.env, PAGES_BASE_PATH: "/xunjian",
    NEXT_PUBLIC_SUPABASE_URL: "https://browser-test.supabase.invalid",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "browser-test-public-key" },
});
const code = await new Promise(resolve => build.on("exit", resolve));
if (code !== 0) process.exit(code ?? 1);
const root = path.resolve("out");
const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon" };
let workerVersion = 0;
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:3187");
    if (url.pathname === "/__test__/next-worker" && request.method === "POST") {
      workerVersion++;
      response.writeHead(200).end(String(workerVersion));
      return;
    }
    if (!url.pathname.startsWith("/xunjian/")) { response.writeHead(404).end(); return; }
    let file = path.resolve(root, decodeURIComponent(url.pathname.slice("/xunjian/".length)) || "index.html");
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    let content = await readFile(file);
    if (file === path.join(root, "sw.js")) {
      content = Buffer.from(content.toString().replace(/"version":"[^"]+"/, `"version":"browser-${workerVersion}"`));
    }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(content);
  } catch { response.writeHead(404).end(); }
});
server.listen(3187, "127.0.0.1");
for (const event of ["SIGINT", "SIGTERM"]) process.on(event, () => { server.close(); process.exit(0); });
