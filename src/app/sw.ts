/// <reference lib="esnext" />
/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist';
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist';

import { parsePushPayload, resolveNotificationUrl } from '../lib/pushPayload';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

/**
 * Deliberately narrower than Serwist's `defaultCache`, which also runtime-caches
 * HTML documents, RSC payloads and `/api` GETs. Every page here is
 * server-rendered against the session cookie, so a cached document or RSC
 * payload can outlive the session and be replayed to whoever opens the app
 * next. Only fingerprinted or otherwise user-agnostic assets are cached;
 * everything else goes to the network and falls back to `/offline`.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
    handler: new CacheFirst({
      cacheName: 'google-fonts',
      plugins: [
        new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: YEAR_IN_SECONDS }),
      ],
    }),
  },
  {
    matcher: /\/_next\/static\/.+/i,
    handler: new CacheFirst({
      cacheName: 'next-static-assets',
      plugins: [
        new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: YEAR_IN_SECONDS }),
      ],
    }),
  },
  {
    matcher: /\/_next\/image\?url=.+$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'next-image',
      plugins: [
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: WEEK_IN_SECONDS }),
      ],
    }),
  },
  {
    matcher: /\.(?:woff2?|eot|ttf|otf)$/i,
    handler: new CacheFirst({
      cacheName: 'static-font-assets',
      plugins: [
        new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: YEAR_IN_SECONDS }),
      ],
    }),
  },
  {
    matcher: /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i,
    handler: new StaleWhileRevalidate({
      cacheName: 'static-image-assets',
      plugins: [
        new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: WEEK_IN_SECONDS }),
      ],
    }),
  },
  {
    matcher: () => true,
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

/*
 * Web Push. The server sends an encrypted JSON payload ({ title, body, url, tag }); it is shown
 * as-is, and a tap focuses an open FinanceOS window (navigating it to the target) or opens one.
 * `tag` lets a newer notification for the same bill replace the older one.
 */
self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event.data?.text());
  const options: Parameters<typeof self.registration.showNotification>[1] & { renotify?: boolean } = {
    body: payload.body,
    tag: payload.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url },
    renotify: Boolean(payload.tag),
  };
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const target = resolveNotificationUrl(data?.url, self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    }),
  );
});
