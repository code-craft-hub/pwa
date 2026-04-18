import { NextRequest, NextResponse } from "next/server";
import {
  getActiveTokenCount,
  getDeliveryAnalytics,
} from "@/lib/fcm/token-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/fcm/analytics?days=7
 *
 * Returns delivery stats for the given look-back window (default 7 days):
 *   total       — total send attempts
 *   sent        — successful deliveries
 *   failed      — transient failures
 *   invalidTokens — expired / unregistered tokens (already deactivated)
 *   successRate — percentage
 *   activeDevices — current active token count
 *   periodDays  — look-back window used
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 7)));

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [analytics, activeDevices] = await Promise.all([
      getDeliveryAnalytics(since),
      getActiveTokenCount(),
    ]);

    return NextResponse.json({ ...analytics, activeDevices, periodDays: days });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
