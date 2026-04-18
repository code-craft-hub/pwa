import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { sendToMultipleTokens } from "@/lib/fcm/sender";
import type { FcmMessage } from "@/lib/fcm/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/fcm/multicast
 *
 * Send the same message to an explicit list of tokens.
 * Use /api/fcm/broadcast to target ALL registered devices.
 *
 * Body:
 *   tokens       — string[]  (max 500 per request; larger sets are auto-chunked)
 *   notification — { title, body, imageUrl? }
 *   data         — optional string key/value map
 *   webpush/android/apns — optional platform overrides
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured" },
      { status: 503 }
    );
  }

  let body: { tokens?: string[] } & Partial<FcmMessage>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tokens, ...message } = body;

  if (!Array.isArray(tokens) || tokens.length === 0) {
    return NextResponse.json({ error: "tokens must be a non-empty array" }, { status: 400 });
  }

  if (!message.notification && !message.data) {
    return NextResponse.json(
      { error: "Message must have notification or data" },
      { status: 400 }
    );
  }

  try {
    const result = await sendToMultipleTokens(tokens, message as FcmMessage);
    return NextResponse.json({
      ok: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokens: result.invalidTokens,
      errors: result.errors,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message ?? "Multicast failed" }, { status: 500 });
  }
}
