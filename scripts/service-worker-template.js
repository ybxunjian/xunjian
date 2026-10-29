/* Generated at build time from this template. */
const { basePath, version, assets } = __SW_CONFIG__;
const cachePrefix = `night-inspection-shell:${basePath || "root"}:`;
const cacheName = `${cachePrefix}${version}`;
const appShellUrl = `${basePath}/index.html`;
const assetPaths = new Set(assets.map((asset) => new URL(asset, self.location.origin).pathname));

self.addEventListener("install", (event) => {
  // A failed precache leaves the previous worker and its complete shell intact.
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(`${basePath}/`)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch {
        // The previously precached shell is the fallback for a disconnected device.
      }
      return (await caches.match(appShellUrl)) || Response.error();
    })());
    return;
  }

  if (assetPaths.has(url.pathname)) {
    event.respondWith((async () =>
      (await caches.match(url.pathname)) || fetch(request)
    )());
  }
});
