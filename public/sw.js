/**
 * Service Worker — Quote Notifications
 *
 * Responsibilities:
 *   1. Receive push events from the server (web-push / VAPID)
 *   2. Display system notifications
 *   3. Handle notification click → focus/open the app
 *   4. Cache-first strategy for static assets (optional PWA offline support)
 */

const CACHE_NAME = "quote-pwa-v1";
const STATIC_ASSETS = ["/", "/manifest.webmanifest"];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // activate immediately
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // take control of all open tabs
  );
});

// ─── Fetch (cache-first for static, network for API) ──────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Let API routes always go to the network
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request)
    )
  );
});

// ─── Push ──────────────────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let payload;

  try {
    payload = event.data?.json();
  } catch {
    payload = {
      title: "Quote of the Day",
      body: event.data?.text() ?? "A new quote is waiting for you!",
    };
  }

  const {
    title = "Quote of the Day",
    body = "Tap to read today's quote.",
    icon = "/manifest-icon-192.maskable.png",
    badge = "/favicon-196.png",
    tag = "quote-of-the-day",
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag,                  // collapses duplicate notifications
    renotify: true,       // vibrate even if same tag
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    data,
    actions: [
      { action: "open", title: "Read more" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Push subscription change ─────────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  // Re-subscribe and send new subscription to server
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then((subscription) =>
        fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        })
      )
  );
});
