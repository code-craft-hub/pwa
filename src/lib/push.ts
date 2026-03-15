import webpush from "web-push";
import type { PushSubscription as WebPushSubscription, SendResult } from "web-push";

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

let isVapidConfigured = false;

/**
 * Lazily configure VAPID — called once on first use.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL env vars.
 *
 * Generate keys with:
 *   npx web-push generate-vapid-keys
 */
function ensureVapidConfigured(): void {
  if (isVapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    throw new Error(
      "VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL."
    );
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  isVapidConfigured = true;
}

/**
 * Sends a push notification to a single subscriber.
 * Returns null on expired/invalid subscription (caller should remove it from store).
 */
export async function sendPushNotification(
  subscription: WebPushSubscription,
  payload: NotificationPayload
): Promise<SendResult | null> {
  ensureVapidConfigured();

  try {
    return await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 } // seconds — drop if undelivered after 1 min
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404 / 410 = subscription expired or unsubscribed
    if (status === 404 || status === 410) {
      console.warn("[push] Stale subscription removed:", subscription.endpoint);
      return null;
    }
    throw err;
  }
}

/**
 * Fan-out push notification to all subscribers.
 * Removes stale subscriptions automatically.
 */
export async function broadcastNotification(
  subscriptions: WebPushSubscription[],
  payload: NotificationPayload,
  onStale?: (endpoint: string) => void
): Promise<{ sent: number; failed: number; stale: number }> {
  ensureVapidConfigured();

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  let stale = 0;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      if (result.value === null) {
        stale++;
        onStale?.(subscriptions[i].endpoint);
      } else {
        sent++;
      }
    } else {
      failed++;
      console.error("[push] Delivery failed:", result.reason);
    }
  });

  return { sent, failed, stale };
}

export function isVapidReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_EMAIL
  );
}
