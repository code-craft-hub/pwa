import { NextRequest, NextResponse } from "next/server";
import { deactivateToken, upsertToken } from "@/lib/fcm/token-store";

export const dynamic = "force-dynamic";

/** POST /api/fcm/token — register a device token */
export async function POST(req: NextRequest) {
  let body: { token?: string; userAgent?: string; metadata?: Record<string, unknown> };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, userAgent, metadata } = body;

  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid FCM token" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  try {
    await upsertToken(token, { userAgent, ipAddress: ip, metadata });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[fcm/token] upsert failed:", err);
    return NextResponse.json({ error: "Failed to register token" }, { status: 500 });
  }
}

/** DELETE /api/fcm/token — deactivate a device token */
export async function DELETE(req: NextRequest) {
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
    await deactivateToken(body.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fcm/token] deactivate failed:", err);
    return NextResponse.json({ error: "Failed to deactivate token" }, { status: 500 });
  }
}
