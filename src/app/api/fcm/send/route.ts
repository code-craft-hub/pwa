import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { sendToToken } from "@/lib/fcm/sender";
import type { FcmMessage } from "@/lib/fcm/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/fcm/send
 *
 * Send a notification to a specific device token.
 *
 * Body:
 *   token        — FCM registration token
 *   notification — { title, body, imageUrl? }
 *   data         — optional string key/value pairs
 *   webpush      — optional web-specific overrides
 *   android      — optional Android-specific config
 *   apns         — optional APNS config
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured (FIREBASE_SERVICE_ACCOUNT_KEY)" },
      { status: 503 }
    );
  }

  let body: { token?: string } & Partial<FcmMessage>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, ...message } = body;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!message.notification && !message.data) {
    return NextResponse.json(
      { error: "Message must have notification or data" },
      { status: 400 }
    );
  }

  try {
    const messageId = await sendToToken(token, message as FcmMessage);
    return NextResponse.json({ ok: true, messageId });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: error.message ?? "Send failed", code: error.code },
      { status: 500 }
    );
  }
}
