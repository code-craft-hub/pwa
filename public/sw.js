/**
 * Service Worker — PWA caching + Firebase Cloud Messaging background handler
 *
 * Boot order:
 *   1. importScripts('/api/firebase-sw-config') → sets self.FIREBASE_CONFIG
 *   2. If config has apiKey, import Firebase compat libs and init messaging
 *   3. Register caching, push, and notificationclick handlers
 */

const CACHE_NAME = "waki-pwa-v2";
const STATIC_ASSETS = ["/", "/manifest.webmanifest"];

// ─── Firebase FCM (loaded only when project is configured) ────────────────────
let _fcmReady = false;

try {
  importScripts("/api/firebase-sw-config");

  if (self.FIREBASE_CONFIG && self.FIREBASE_CONFIG.apiKey) {
    importScripts(
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
    );
    importScripts(
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
    );

    firebase.initializeApp(self.FIREBASE_CONFIG);
    const messaging = firebase.messaging();

    /**
     * onBackgroundMessage — fires when a DATA-only or notification message
     * arrives while the app tab is closed / in background.
     * For notification messages while the app is in FOREGROUND, the client
     * SDK's onMessage() handler in useFCM.ts takes over.
     */
    messaging.onBackgroundMessage((payload) => {
      const { notification, data, fcmOptions } = payload;

      const title =
        notification?.title ?? data?.title ?? "New Message";
      const body =
        notification?.body ?? data?.body ?? "";
      const imageUrl = notification?.imageUrl ?? data?.imageUrl;

      const options = {
        body,
        icon:
          notification?.icon ??
          data?.icon ??
          "/manifest-icon-192.maskable.png",
        badge: "/favicon-196.png",
        image: imageUrl,
        tag: data?.tag ?? payload.collapseKey ?? `fcm-${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: data?.requireInteraction === "true",
        silent: data?.silent === "true",
        data: {
          url: fcmOptions?.link ?? data?.clickAction ?? data?.url ?? "/",
          ...data,
        },
        actions: [
          { action: "open", title: "Open" },
          { action: "dismiss", title: "Dismiss" },
        ],
      };

      return self.registration.showNotification(title, options);
    });

    _fcmReady = true;
    console.log("[SW] Firebase Cloud Messaging initialized");
  }
} catch (err) {
  console.warn("[SW] FCM initialization skipped:", err?.message ?? err);
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch (cache-first for static, network-first for API) ───────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always bypass cache for API routes
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => cached ?? fetch(event.request))
  );
});

// ─── Legacy VAPID push (fallback when FCM is not configured) ─────────────────
self.addEventListener("push", (event) => {
  // When FCM is active it intercepts push events via onBackgroundMessage above.
  // This handler only fires for raw VAPID pushes (non-FCM path).
  if (_fcmReady) return;

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
    title = "Notification",
    body = "Tap to open.",
    icon = "/manifest-icon-192.maskable.png",
    badge = "/favicon-196.png",
    tag = `push-${Date.now()}`,
    data = {},
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data,
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) =>
          c.url.includes(self.location.origin)
        );
        if (existing && "focus" in existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Push subscription change (VAPID token rotation) ─────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  if (_fcmReady) return; // FCM handles its own token rotation

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

// ─── Client message bus ───────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data?.type === "FCM_STATUS_REQUEST") {
    event.ports?.[0]?.postMessage({ fcmReady: _fcmReady });
  }
});
