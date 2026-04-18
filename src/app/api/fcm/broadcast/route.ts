import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { broadcast } from "@/lib/fcm/sender";
import { getAllActiveTokens } from "@/lib/fcm/token-store";
import type { FcmMessage } from "@/lib/fcm/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/fcm/broadcast
 *
 * Fan-out a notification to ALL active registered devices.
 * Automatically chunks 500 tokens per multicast call (FCM limit).
 * Stale tokens are deactivated in the DB.
 *
 * Body: FcmMessage (same shape as /api/fcm/send, minus the token field)
 */
export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Firebase Admin SDK not configured" },
      { status: 503 }
    );
  }

  let message: FcmMessage;

  try {
    message = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!message.notification && !message.data) {
    return NextResponse.json(
      { error: "Message must have notification or data" },
      { status: 400 }
    );
  }

  try {
    const result = await broadcast(message, getAllActiveTokens);
    return NextResponse.json({
      ok: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokens: result.invalidTokens.length,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message ?? "Broadcast failed" }, { status: 500 });
  }
}
