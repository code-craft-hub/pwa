import type {
  BatchResponse,
  Message,
  MulticastMessage,
  SendResponse,
} from "firebase-admin/messaging";
import { getAdminMessaging } from "@/lib/firebase/admin";
import { deactivateToken, safeRecordDelivery } from "./token-store";
import type { BatchSendResult, FcmMessage, SendResult } from "./types";

const MULTICAST_CHUNK = 500; // FCM hard limit per sendEachForMulticast call
const BATCH_CHUNK = 500;     // FCM hard limit per sendEach call

// ─── Message builder ─────────────────────────────────────────────────────────

function buildMessage(
  target: { token?: string; topic?: string; condition?: string },
  msg: FcmMessage
): Message {
  return {
    ...target,
    notification: msg.notification
      ? {
          title: msg.notification.title,
          body: msg.notification.body,
          imageUrl: msg.notification.imageUrl,
        }
      : undefined,
    data: msg.data,
    webpush: msg.webpush
      ? {
          notification: msg.webpush.notification
            ? {
                title: msg.notification?.title,
                body: msg.notification?.body,
                icon:
                  msg.notification?.icon ??
                  "/manifest-icon-192.maskable.png",
                badge: msg.notification?.badge ?? "/favicon-196.png",
                ...msg.webpush.notification,
              }
            : undefined,
          fcmOptions: msg.webpush.fcmOptions,
          headers: msg.webpush.headers,
        }
      : {
          // Default web push settings for every message
          notification: {
            title: msg.notification?.title,
            body: msg.notification?.body,
            icon: "/manifest-icon-192.maskable.png",
            badge: "/favicon-196.png",
            vibrate: [200, 100, 200],
          },
        },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    android: msg.android as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apns: msg.apns as any,
  } as Message;
}

// ─── Error classifier ─────────────────────────────────────────────────────────

function isTokenInvalid(code?: string): boolean {
  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-argument"
  );
}

// ─── Send to single token ─────────────────────────────────────────────────────

export async function sendToToken(token: string, message: FcmMessage): Promise<string> {
  const messaging = getAdminMessaging();
  const msg = buildMessage({ token }, message);

  try {
    const messageId = await messaging.send(msg);
    await safeRecordDelivery({
      messageId,
      token,
      status: "sent",
      payload: message as unknown as Record<string, unknown>,
    });
    return messageId;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (isTokenInvalid(error.code)) {
      await deactivateToken(token);
      await safeRecordDelivery({
        token,
        status: "invalid_token",
        errorCode: error.code,
        errorMessage: error.message,
      });
    } else {
      await safeRecordDelivery({
        token,
        status: "failed",
        errorCode: error.code,
        errorMessage: error.message,
      });
    }
    throw err;
  }
}

// ─── Multicast (up to 500 per chunk, auto-chunked) ────────────────────────────

export async function sendToMultipleTokens(
  tokens: string[],
  message: FcmMessage
): Promise<SendResult> {
  if (tokens.length === 0)
    return { successCount: 0, failureCount: 0, invalidTokens: [], messageIds: [], errors: [] };

  const messaging = getAdminMessaging();
  const result: SendResult = {
    successCount: 0,
    failureCount: 0,
    invalidTokens: [],
    messageIds: [],
    errors: [],
  };

  for (let i = 0; i < tokens.length; i += MULTICAST_CHUNK) {
    const chunk = tokens.slice(i, i + MULTICAST_CHUNK);
    const multicast: MulticastMessage = {
      tokens: chunk,
      notification: message.notification
        ? {
            title: message.notification.title,
            body: message.notification.body,
            imageUrl: message.notification.imageUrl,
          }
        : undefined,
      data: message.data,
      webpush: buildMessage({ token: "x" }, message).webpush,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      android: message.android as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apns: message.apns as any,
    };

    const batch: BatchResponse = await messaging.sendEachForMulticast(multicast);

    await Promise.all(
      batch.responses.map(async (resp: SendResponse, idx: number) => {
        const token = chunk[idx];
        if (resp.success) {
          result.successCount++;
          result.messageIds.push(resp.messageId!);
          await safeRecordDelivery({ messageId: resp.messageId, token, status: "sent" });
        } else {
          result.failureCount++;
          const code = (resp.error as { code?: string } | undefined)?.code;
          const msg = resp.error?.message;
          if (isTokenInvalid(code)) {
            result.invalidTokens.push(token);
            await deactivateToken(token);
            await safeRecordDelivery({ token, status: "invalid_token", errorCode: code, errorMessage: msg });
          } else {
            result.errors.push({ token, error: msg ?? "unknown" });
            await safeRecordDelivery({ token, status: "failed", errorCode: code, errorMessage: msg });
          }
        }
      })
    );
  }

  return result;
}

// ─── Send to topic ────────────────────────────────────────────────────────────

export async function sendToTopic(topic: string, message: FcmMessage): Promise<string> {
  const messaging = getAdminMessaging();
  const msg = buildMessage({ topic }, message);

  try {
    const messageId = await messaging.send(msg);
    await safeRecordDelivery({ messageId, topic, status: "sent" });
    return messageId;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    await safeRecordDelivery({ topic, status: "failed", errorCode: error.code, errorMessage: error.message });
    throw err;
  }
}

// ─── Send by condition (e.g. "'sports' in topics && 'weather' in topics") ─────

export async function sendToCondition(condition: string, message: FcmMessage): Promise<string> {
  const messaging = getAdminMessaging();
  const msg = buildMessage({ condition }, message);

  try {
    const messageId = await messaging.send(msg);
    await safeRecordDelivery({ messageId, condition, status: "sent" });
    return messageId;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    await safeRecordDelivery({ condition, status: "failed", errorCode: error.code, errorMessage: error.message });
    throw err;
  }
}

// ─── Batch send (heterogeneous targets, auto-chunked) ─────────────────────────

export async function sendBatch(
  messages: Array<{
    target: { token?: string; topic?: string; condition?: string };
    message: FcmMessage;
  }>
): Promise<BatchSendResult> {
  if (messages.length === 0) return { successCount: 0, failureCount: 0, responses: [] };

  const messaging = getAdminMessaging();
  const result: BatchSendResult = { successCount: 0, failureCount: 0, responses: [] };

  for (let i = 0; i < messages.length; i += BATCH_CHUNK) {
    const chunk = messages.slice(i, i + BATCH_CHUNK);
    const adminMessages: Message[] = chunk.map(({ target, message }) =>
      buildMessage(target, message)
    );

    const batch: BatchResponse = await messaging.sendEach(adminMessages);
    result.successCount += batch.successCount;
    result.failureCount += batch.failureCount;
    result.responses.push(
      ...batch.responses.map((r: SendResponse) => ({
        success: r.success,
        messageId: r.messageId,
        error: r.error?.message,
      }))
    );
  }

  return result;
}

// ─── Broadcast to all active devices ─────────────────────────────────────────

export async function broadcast(
  message: FcmMessage,
  getTokens: () => Promise<string[]>
): Promise<SendResult> {
  const tokens = await getTokens();
  return sendToMultipleTokens(tokens, message);
}
