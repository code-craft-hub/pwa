import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { sendToCondition, sendToTopic } from "@/lib/fcm/sender";
import type { FcmMessage } from "@/lib/fcm/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/fcm/topics/send
 *
 * Send to a named topic OR a boolean condition expression.
 *
 * Body:
 *   topic        — e.g. "weather"   (mutually exclusive with condition)
 *   condition    — e.g. "'weather' in topics && 'alerts' in topics"
 *   notification — { title, body, imageUrl? }
 *   data         — optional string key/value pairs
 *
 * FCM conditions support &&, ||, and ! operators with up to 5 topic predicates.
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured" },
      { status: 503 }
    );
  }

  let body: { topic?: string; condition?: string } & Partial<FcmMessage>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { topic, condition, ...message } = body;

  if (!topic && !condition) {
    return NextResponse.json(
      { error: "Provide either topic or condition" },
      { status: 400 }
    );
  }

  if (!message.notification && !message.data) {
    return NextResponse.json(
      { error: "Message must have notification or data" },
      { status: 400 }
    );
  }

  try {
    let messageId: string;

    if (condition) {
      messageId = await sendToCondition(condition, message as FcmMessage);
    } else {
      messageId = await sendToTopic(topic!, message as FcmMessage);
    }

    return NextResponse.json({ ok: true, messageId });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: error.message ?? "Send failed", code: error.code },
      { status: 500 }
    );
  }
}
