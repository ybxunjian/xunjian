import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = path.join(root, "out");
const templatePath = new URL("./service-worker-template.js", import.meta.url);
const staticFiles = [
  "index.html",
  "manifest.webmanifest",
  "favicon.ico",
  "icon.svg",
  "apple-icon.png",
];

export function normalizeBasePath(value = "") {
  if (value && !/^\/(?:[A-Za-z0-9._~-]+)(?:\/[A-Za-z0-9._~-]+)*$/.test(value)) {
    throw new Error(`Invalid PAGES_BASE_PATH: ${value}`);
  }
  return value;
}

export function renderServiceWorker(template, { basePath, version, files }) {
  if (!template.includes("__SW_CONFIG__")) {
    throw new Error("Service worker template is missing its configuration slot");
  }
  const assets = files.map((file) => `${basePath}/${file.replaceAll(path.sep, "/")}`);
  return template.replace("__SW_CONFIG__", JSON.stringify({ basePath, version, assets }));
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory()
      ? collectFiles(path.join(directory, entry.name), relative)
      : [relative];
  }));
  return nested.flat().sort();
}

async function generate() {
  const basePath = normalizeBasePath(process.env.PAGES_BASE_PATH ?? "");
  const files = [
    ...staticFiles,
    ...await collectFiles(path.join(out, "icons"), "icons"),
    ...await collectFiles(path.join(out, "_next", "static"), "_next/static"),
  ];
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(await readFile(path.join(out, file)));
  }
  const version = hash.digest("hex").slice(0, 16);
  const template = await readFile(templatePath, "utf8");
  await writeFile(
    path.join(out, "sw.js"),
    renderServiceWorker(template, { basePath, version, files }),
  );
  process.stdout.write(`Offline shell: ${files.length} files, version ${version}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generate();
}
