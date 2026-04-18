import { neon } from "@neondatabase/serverless";
import type { DeliveryStatus, FcmDeliveryRecord } from "./types";

// ─── Connection ───────────────────────────────────────────────────────────────

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

// ─── Token management ─────────────────────────────────────────────────────────

export async function upsertToken(
  token: string,
  meta: { userAgent?: string; ipAddress?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO push.fcm_tokens (token, user_agent, ip_address, metadata)
    VALUES (
      ${token},
      ${meta.userAgent ?? null},
      ${meta.ipAddress ?? null},
      ${JSON.stringify(meta.metadata ?? {})}
    )
    ON CONFLICT (token) DO UPDATE SET
      updated_at     = NOW(),
      last_active_at = NOW(),
      is_active      = TRUE,
      user_agent     = EXCLUDED.user_agent,
      ip_address     = EXCLUDED.ip_address
  `;
}

export async function deactivateToken(token: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE push.fcm_tokens
    SET is_active = FALSE, updated_at = NOW()
    WHERE token = ${token}
  `;
}

export async function getAllActiveTokens(): Promise<string[]> {
  const db = sql();
  const rows = await db`
    SELECT token FROM push.fcm_tokens WHERE is_active = TRUE
  `;
  return rows.map((r) => r.token as string);
}

export async function getTokensByTopic(topic: string): Promise<string[]> {
  const db = sql();
  const rows = await db`
    SELECT token FROM push.fcm_tokens
    WHERE is_active = TRUE AND ${topic} = ANY(topics)
  `;
  return rows.map((r) => r.token as string);
}

export async function getActiveTokenCount(): Promise<number> {
  const db = sql();
  const rows = await db`
    SELECT COUNT(*)::INT AS count FROM push.fcm_tokens WHERE is_active = TRUE
  `;
  return (rows[0]?.count as number) ?? 0;
}

// ─── Topic management ─────────────────────────────────────────────────────────

export async function addTopicToToken(token: string, topic: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE push.fcm_tokens
    SET topics = array_append(topics, ${topic}), updated_at = NOW()
    WHERE token = ${token} AND NOT (${topic} = ANY(topics))
  `;
}

export async function removeTopicFromToken(token: string, topic: string): Promise<void> {
  const db = sql();
  await db`
    UPDATE push.fcm_tokens
    SET topics = array_remove(topics, ${topic}), updated_at = NOW()
    WHERE token = ${token}
  `;
}

export async function getTopicsForToken(token: string): Promise<string[]> {
  const db = sql();
  const rows = await db`
    SELECT topics FROM push.fcm_tokens WHERE token = ${token}
  `;
  return (rows[0]?.topics as string[]) ?? [];
}

// ─── Delivery tracking ────────────────────────────────────────────────────────

export async function recordDelivery(
  record: Omit<FcmDeliveryRecord, "id" | "sentAt">
): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO push.fcm_deliveries
      (message_id, token, topic, condition, status, error_code, error_message, payload)
    VALUES (
      ${record.messageId ?? null},
      ${record.token ?? null},
      ${record.topic ?? null},
      ${record.condition ?? null},
      ${record.status},
      ${record.errorCode ?? null},
      ${record.errorMessage ?? null},
      ${record.payload ? JSON.stringify(record.payload) : null}
    )
  `;
}

export async function getDeliveryAnalytics(since?: Date): Promise<{
  total: number;
  sent: number;
  failed: number;
  invalidTokens: number;
  successRate: number;
}> {
  const db = sql();
  const cutoff = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db`
    SELECT status, COUNT(*)::INT AS count
    FROM push.fcm_deliveries
    WHERE sent_at >= ${cutoff.toISOString()}
    GROUP BY status
  `;
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status as string] = row.count as number;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const sent = counts["sent"] ?? 0;
  return {
    total,
    sent,
    failed: counts["failed"] ?? 0,
    invalidTokens: counts["invalid_token"] ?? 0,
    successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
  };
}

// ─── Graceful no-op when DB is not configured ─────────────────────────────────

export async function safeRecordDelivery(
  record: Omit<FcmDeliveryRecord, "id" | "sentAt">
): Promise<void> {
  try {
    await recordDelivery(record);
  } catch {
    // DB not configured — skip tracking silently
  }
}

// Re-export for convenience
export type { DeliveryStatus };
