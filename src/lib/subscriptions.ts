import type { PushSubscription as WebPushSubscription } from "web-push";

/**
 * Subscription store abstraction.
 *
 * PRODUCTION NOTE:
 * This in-memory implementation works perfectly in development and single-instance
 * deployments. For Vercel's serverless/edge environment (stateless, multi-instance),
 * replace this with Vercel KV:
 *
 *   import { kv } from "@vercel/kv";
 *   const KEY = "push:subscriptions";
 *   export async function addSubscription(sub) { await kv.hset(KEY, sub.endpoint, sub); }
 *   export async function removeSubscription(endpoint) { await kv.hdel(KEY, endpoint); }
 *   export async function getAllSubscriptions() { return Object.values(await kv.hgetall(KEY) ?? {}); }
 */

// Module-level singleton — stable within the same Node.js process lifetime.
const store = new Map<string, WebPushSubscription>();

export function addSubscription(subscription: WebPushSubscription): void {
  store.set(subscription.endpoint, subscription);
}

export function removeSubscription(endpoint: string): void {
  store.delete(endpoint);
}

export function getAllSubscriptions(): WebPushSubscription[] {
  return Array.from(store.values());
}

export function getSubscriptionCount(): number {
  return store.size;
}
