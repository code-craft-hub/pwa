"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessagePayload,
  deleteToken,
  getToken,
  onMessage,
} from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase/client";
import { FCM_VAPID_KEY } from "@/lib/firebase/config";
import type { Quote } from "@/lib/quotes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FCMPermissionState = "unsupported" | "default" | "granted" | "denied" | "loading";

export interface FCMMessage {
  title?: string;
  body?: string;
  imageUrl?: string;
  data?: Record<string, string>;
  collapseKey?: string;
  timestamp: number;
}

export interface UseFCMReturn {
  /** Current notification permission / FCM state. */
  state: FCMPermissionState;
  /** The current FCM registration token (null until granted). */
  fcmToken: string | null;
  /** True while permission is being requested or token is being fetched. */
  isRegistering: boolean;
  /** Last foreground message received while the app was open. */
  lastMessage: FCMMessage | null;
  /** Last quote parsed from an incoming FCM message. */
  lastQuote: Quote | null;
  /** Topics this device is currently subscribed to (from localStorage). */
  subscribedTopics: string[];
  /** Request notification permission and obtain an FCM token. */
  requestPermission: () => Promise<void>;
  /** Delete the FCM token, deregister from server, reset state. */
  unsubscribe: () => Promise<void>;
  /** Subscribe this device token to a named FCM topic. */
  subscribeToTopic: (topic: string) => Promise<void>;
  /** Unsubscribe this device token from a named FCM topic. */
  unsubscribeFromTopic: (topic: string) => Promise<void>;
  /** Fire a test notification to this device via the server. */
  sendTestNotification: () => Promise<void>;
  /** Manually refresh the FCM token (e.g. after key rotation). */
  refreshToken: () => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SW_PATH = "/sw.js";
const TOKEN_KEY = "fcm:token";
const TOPICS_KEY = "fcm:topics";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFCM(): UseFCMReturn {
  const [state, setState] = useState<FCMPermissionState>("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastMessage, setLastMessage] = useState<FCMMessage | null>(null);
  const [lastQuote, setLastQuote] = useState<Quote | null>(null);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const unsubForegroundRef = useRef<(() => void) | null>(null);

  // ─── Hydrate initial state ──────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setState("unsupported");
      return;
    }

    setState(Notification.permission as FCMPermissionState);

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) setFcmToken(storedToken);

    try {
      const topics = JSON.parse(localStorage.getItem(TOPICS_KEY) ?? "[]");
      if (Array.isArray(topics)) setSubscribedTopics(topics);
    } catch {
      // corrupt storage — reset
      localStorage.removeItem(TOPICS_KEY);
    }
  }, []);

  // ─── Register service worker ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register(SW_PATH, { scope: "/" })
      .then((reg) => {
        swRegRef.current = reg;
      })
      .catch((err) => console.error("[useFCM] SW registration failed:", err));
  }, []);

  // ─── Foreground message listener ────────────────────────────────────────
  const attachForegroundListener = useCallback(async () => {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return;

    // Tear down previous listener first
    unsubForegroundRef.current?.();

    const unsub = onMessage(messaging, (payload: MessagePayload) => {
      const msg: FCMMessage = {
        title: payload.notification?.title,
        body: payload.notification?.body,
        imageUrl: (payload.notification as unknown as Record<string, string> | undefined)?.imageUrl,
        data: payload.data as Record<string, string> | undefined,
        collapseKey: payload.collapseKey,
        timestamp: Date.now(),
      };

      setLastMessage(msg);

      // Extract quote from data payload if present
      if (payload.data?.quote) {
        try {
          setLastQuote(JSON.parse(payload.data.quote));
        } catch {
          // malformed — ignore
        }
      }

      // Show an in-app notification via SW (foreground messages don't auto-display)
      const swReg = swRegRef.current;
      if (swReg && Notification.permission === "granted") {
        swReg.showNotification(
          payload.notification?.title ?? "New Message",
          {
            body: payload.notification?.body,
            icon: "/manifest-icon-192.maskable.png",
            badge: "/favicon-196.png",
            tag: payload.collapseKey ?? `fcm-fg-${Date.now()}`,
            data: {
              url: payload.fcmOptions?.link ?? payload.data?.url ?? "/",
              ...payload.data,
            },
          }
        );
      }
    });

    unsubForegroundRef.current = unsub;
  }, []);

  // ─── Reattach listener when state or token changes ──────────────────────
  useEffect(() => {
    if (state === "granted" && fcmToken) {
      attachForegroundListener();
    }
    return () => {
      unsubForegroundRef.current?.();
    };
  }, [state, fcmToken, attachForegroundListener]);

  // ─── requestPermission ───────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (state === "unsupported" || state === "loading") return;
    setIsRegistering(true);

    try {
      const permission = await Notification.requestPermission();
      setState(permission as FCMPermissionState);
      if (permission !== "granted") return;

      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        setState("unsupported");
        return;
      }

      const swReg =
        swRegRef.current ?? (await navigator.serviceWorker.ready);
      swRegRef.current = swReg;

      const token = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      setFcmToken(token);
      localStorage.setItem(TOKEN_KEY, token);

      await fetch("/api/fcm/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userAgent: navigator.userAgent }),
      });

      await attachForegroundListener();
    } finally {
      setIsRegistering(false);
    }
  }, [state, attachForegroundListener]);

  // ─── unsubscribe ─────────────────────────────────────────────────────────
  const unsubscribe = useCallback(async () => {
    unsubForegroundRef.current?.();
    unsubForegroundRef.current = null;

    const token = fcmToken;
    if (token) {
      const messaging = await getFirebaseMessaging();
      if (messaging) {
        try {
          await deleteToken(messaging);
        } catch {
          // token may already be deleted
        }
      }

      await fetch("/api/fcm/token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      localStorage.removeItem(TOKEN_KEY);
      setFcmToken(null);
    }

    setState("default");
  }, [fcmToken]);

  // ─── refreshToken ────────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    if (state !== "granted") return;
    setIsRegistering(true);

    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      const swReg = swRegRef.current ?? (await navigator.serviceWorker.ready);
      const newToken = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (newToken !== fcmToken) {
        // Deactivate old token on server
        if (fcmToken) {
          await fetch("/api/fcm/token", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: fcmToken }),
          });
        }

        // Register new token
        await fetch("/api/fcm/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: newToken, userAgent: navigator.userAgent }),
        });

        setFcmToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
      }
    } finally {
      setIsRegistering(false);
    }
  }, [state, fcmToken]);

  // ─── subscribeToTopic ────────────────────────────────────────────────────
  const subscribeToTopic = useCallback(
    async (topic: string) => {
      if (!fcmToken) throw new Error("No FCM token — request permission first");

      const res = await fetch(`/api/fcm/topics/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fcmToken }),
      });

      if (!res.ok) throw new Error(await res.text());

      const updated = [...new Set([...subscribedTopics, topic])];
      setSubscribedTopics(updated);
      localStorage.setItem(TOPICS_KEY, JSON.stringify(updated));
    },
    [fcmToken, subscribedTopics]
  );

  // ─── unsubscribeFromTopic ────────────────────────────────────────────────
  const unsubscribeFromTopic = useCallback(
    async (topic: string) => {
      if (!fcmToken) throw new Error("No FCM token");

      const res = await fetch(`/api/fcm/topics/${encodeURIComponent(topic)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fcmToken }),
      });

      if (!res.ok) throw new Error(await res.text());

      const updated = subscribedTopics.filter((t) => t !== topic);
      setSubscribedTopics(updated);
      localStorage.setItem(TOPICS_KEY, JSON.stringify(updated));
    },
    [fcmToken, subscribedTopics]
  );

  // ─── sendTestNotification ────────────────────────────────────────────────
  const sendTestNotification = useCallback(async () => {
    if (!fcmToken) throw new Error("No FCM token");

    const res = await fetch("/api/fcm/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: fcmToken,
        notification: {
          title: "FCM Test ✅",
          body: "Firebase Cloud Messaging is working correctly.",
        },
        data: { type: "test", timestamp: String(Date.now()) },
      }),
    });

    if (!res.ok) throw new Error(await res.text());
  }, [fcmToken]);

  return {
    state,
    fcmToken,
    isRegistering,
    lastMessage,
    lastQuote,
    subscribedTopics,
    requestPermission,
    unsubscribe,
    subscribeToTopic,
    unsubscribeFromTopic,
    sendTestNotification,
    refreshToken,
  };
}
