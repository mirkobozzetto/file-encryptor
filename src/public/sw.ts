/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;
export {};

const STATIC_CACHE = "static-v1";
const DYNAMIC_CACHE = "dynamic-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/modules/app.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

interface MessageData {
  readonly type: string;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          })
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/index.html");
          return fallback!;
        })
    );
    return;
  }

  if (
    url.pathname.startsWith("/modules/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.includes("manifest.json")
  ) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;

        const response = await fetch(request);
        if (response?.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, responseClone);
        }
        return response;
      })
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches
          .open(DYNAMIC_CACHE)
          .then((cache) => cache.put(request, responseClone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached!;
      })
  );
});

self.addEventListener("message", (event) => {
  const data = event.data as MessageData | undefined;
  if (data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
