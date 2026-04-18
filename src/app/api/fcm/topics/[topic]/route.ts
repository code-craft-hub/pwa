import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import {
  subscribeTokenToTopic,
  unsubscribeTokenFromTopic,
} from "@/lib/fcm/topics";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ topic: string }> };

/**
 * POST /api/fcm/topics/:topic
 * Body: { token: string }
 *
 * Subscribe a device to the given topic.
 * Uses Firebase Admin subscribeToTopic() + persists in DB.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin SDK not configured" }, { status: 503 });
  }

  const { topic } = await params;

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await subscribeTokenToTopic(body.token, decodeURIComponent(topic));
    return NextResponse.json({ ok: true, topic: decodeURIComponent(topic) }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message ?? "Subscribe failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/fcm/topics/:topic
 * Body: { token: string }
 *
 * Unsubscribe a device from the given topic.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin SDK not configured" }, { status: 503 });
  }

  const { topic } = await params;

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await unsubscribeTokenFromTopic(body.token, decodeURIComponent(topic));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message ?? "Unsubscribe failed" }, { status: 500 });
  }
}
