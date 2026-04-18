import { getAdminMessaging } from "@/lib/firebase/admin";
import { addTopicToToken, removeTopicFromToken } from "./token-store";

const TOPIC_CHUNK = 1000; // FCM hard limit per subscribeToTopic call

// ─── Single token ─────────────────────────────────────────────────────────────

export async function subscribeTokenToTopic(token: string, topic: string): Promise<void> {
  const messaging = getAdminMessaging();
  const response = await messaging.subscribeToTopic([token], topic);

  if (response.failureCount > 0) {
    throw new Error(
      `FCM topic subscribe failed: ${response.errors[0]?.error?.message ?? "unknown"}`
    );
  }

  await addTopicToToken(token, topic);
}

export async function unsubscribeTokenFromTopic(token: string, topic: string): Promise<void> {
  const messaging = getAdminMessaging();
  const response = await messaging.unsubscribeFromTopic([token], topic);

  if (response.failureCount > 0) {
    throw new Error(
      `FCM topic unsubscribe failed: ${response.errors[0]?.error?.message ?? "unknown"}`
    );
  }

  await removeTopicFromToken(token, topic);
}

// ─── Bulk operations ─────────────────────────────────────────────────────────

export async function subscribeMultipleToTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const messaging = getAdminMessaging();
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += TOPIC_CHUNK) {
    const chunk = tokens.slice(i, i + TOPIC_CHUNK);
    const response = await messaging.subscribeToTopic(chunk, topic);
    successCount += response.successCount;
    failureCount += response.failureCount;

    // Track successful subscriptions in DB (exclude error indices)
    const errorIndices = new Set(response.errors.map((e) => e.index));
    await Promise.all(
      chunk
        .filter((_, idx) => !errorIndices.has(idx))
        .map((token) => addTopicToToken(token, topic))
    );
  }

  return { successCount, failureCount };
}

export async function unsubscribeMultipleFromTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

  const messaging = getAdminMessaging();
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < tokens.length; i += TOPIC_CHUNK) {
    const chunk = tokens.slice(i, i + TOPIC_CHUNK);
    const response = await messaging.unsubscribeFromTopic(chunk, topic);
    successCount += response.successCount;
    failureCount += response.failureCount;

    const errorIndices = new Set(response.errors.map((e) => e.index));
    await Promise.all(
      chunk
        .filter((_, idx) => !errorIndices.has(idx))
        .map((token) => removeTopicFromToken(token, topic))
    );
  }

  return { successCount, failureCount };
}
