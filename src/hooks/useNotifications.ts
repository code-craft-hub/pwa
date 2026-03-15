"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { Quote } from "@/lib/quotes";

export type NotificationState =
  | "unsupported"   // browser doesn't support Notifications or SW
  | "default"       // user hasn't been asked yet
  | "granted"       // notifications enabled, polling active
  | "denied";       // user blocked notifications

interface UseNotificationsReturn {
  state: NotificationState;
  isSubscribing: boolean;
  lastQuote: Quote | null;
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const POLL_INTERVAL_MS = 60_000; // 1 minute — aligns with Vercel Cron minimum
const SW_PATH = "/sw.js";

/** Convert base64 VAPID public key to Uint8Array (required by pushManager.subscribe) */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState<NotificationState>("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [lastQuote, setLastQuote] = useState<Quote | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // ─── Determine initial state ─────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as NotificationState);
  }, []);

  // ─── Register service worker once on mount ────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(SW_PATH, { scope: "/" })
      .then((reg) => {
        swRegistrationRef.current = reg;
        console.log("[useNotifications] SW registered:", reg.scope);
      })
      .catch((err) => {
        console.error("[useNotifications] SW registration failed:", err);
      });
  }, []);

  // ─── Polling logic — fetch quote every 5s and show SW notification ────────
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (Notification.permission !== "granted") return;

      const reg =
        swRegistrationRef.current ?? (await navigator.serviceWorker.ready);

      try {
        const res = await fetch("/api/quotes", { cache: "no-store" });
        if (!res.ok) return;
        const quote: Quote = await res.json();

        setLastQuote(quote);

        // Use SW showNotification — works even when page is backgrounded
        await reg.showNotification("Quote of the Day ✨", {
          body: `"${quote.text}"\n— ${quote.author}`,
          icon: "/manifest-icon-192.maskable.png",
          badge: "/favicon-196.png",
          tag: `quote-${Date.now()}`, // unique tag = stack notifications
          data: { url: "/", quote },
        } as NotificationOptions);
      } catch (err) {
        console.error("[useNotifications] Poll error:", err);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start polling automatically if already granted (e.g. returning user)
  useEffect(() => {
    if (state === "granted") startPolling();
    return stopPolling;
  }, [state, startPolling, stopPolling]);

  // ─── Request permission + subscribe to web push ───────────────────────────
  const requestPermission = useCallback(async () => {
    if (state === "unsupported") return;
    setIsSubscribing(true);

    try {
      const permission = await Notification.requestPermission();
      setState(permission as NotificationState);

      if (permission !== "granted") return;

      // Register (or reuse) service worker
      const reg =
        swRegistrationRef.current ??
        (await navigator.serviceWorker.register(SW_PATH, { scope: "/" }));
      swRegistrationRef.current = reg;

      // Subscribe to web-push (VAPID) if keys are available
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        try {
          const existing = await reg.pushManager.getSubscription();
          if (!existing) {
            const subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            });

            // Register subscription on server for cron-triggered pushes
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subscription),
            });

            console.log("[useNotifications] Web push subscription registered");
          }
        } catch (err) {
          // VAPID push failed — fall through to client-only polling
          console.warn(
            "[useNotifications] Web push subscription failed, using polling only:",
            err
          );
        }
      }

      startPolling();
    } finally {
      setIsSubscribing(false);
    }
  }, [state, startPolling]);

  // ─── Unsubscribe ──────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    stopPolling();

    const reg = swRegistrationRef.current;
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    }

    // Reset to default — user can re-enable (can't un-deny a browser denial)
    setState("default");
  }, [stopPolling]);

  return { state, isSubscribing, lastQuote, requestPermission, unsubscribe };
}
