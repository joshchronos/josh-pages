// Good Time Journal — service worker
// Caches the app shell so the app opens offline. Supabase API calls are
// never intercepted; data still requires a connection.

const CACHE = "gtj-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // never touch Supabase (or any non-GET request)
  if (event.request.method !== "GET" || url.hostname.endsWith(".supabase.co")) return;

  const isShell =
    url.origin === self.location.origin ||
    url.hostname === "cdn.jsdelivr.net";
  if (!isShell) return;

  // stale-while-revalidate: serve cache immediately, refresh in background
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: url.origin === self.location.origin });
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
