import { NextRequest, NextResponse } from "next/server";
import { getAllSubscriptions, removeSubscription } from "@/lib/subscriptions";
import { broadcastNotification, isVapidReady } from "@/lib/push";
import { getRandomQuote } from "@/lib/quotes";

/**
 * GET /api/cron/notify
 *
 * Triggered by Vercel Cron (see vercel.json — runs every minute, minimum on Vercel).
 * Protected by CRON_SECRET to prevent unauthorized invocations.
 *
 * What it does:
 *  1. Picks a fresh random quote
 *  2. Sends a web-push notification to every stored subscriber
 *  3. Auto-removes stale/expired subscriptions
 *
 * Vercel sets the Authorization header automatically when calling cron routes.
 * For manual testing: Authorization: Bearer <CRON_SECRET>
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds — enough for fan-out to many subscribers

export async function GET(request: NextRequest) {
  // — Security: verify Vercel's cron secret ————————————————————————————
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const quote = getRandomQuote();
  const subscriptions = getAllSubscriptions();

  console.log(
    `[cron/notify] Firing. Quote: "${quote.text.slice(0, 40)}…" | Subscribers: ${subscriptions.length}`
  );

  // — Early exit if VAPID isn't configured ————————————————————————————
  if (!isVapidReady()) {
    console.warn(
      "[cron/notify] VAPID keys not configured — skipping push delivery. " +
        "Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL."
    );
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "VAPID not configured",
      quote,
    });
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      message: "No subscribers yet",
      quote,
    });
  }

  // — Broadcast ————————————————————————————————————————————————————————
  const { sent, failed, stale } = await broadcastNotification(
    subscriptions,
    {
      title: "Quote of the Day",
      body: `"${quote.text}" — ${quote.author}`,
      icon: "/manifest-icon-192.maskable.png",
      badge: "/favicon-196.png",
      tag: "quote-of-the-day",
      data: { quote, url: "/" },
    },
    (endpoint) => removeSubscription(endpoint) // clean up stale subs
  );

  const elapsed = Date.now() - startedAt;

  console.log(
    `[cron/notify] Done in ${elapsed}ms — sent: ${sent}, failed: ${failed}, stale removed: ${stale}`
  );

  return NextResponse.json({
    success: true,
    sent,
    failed,
    stale,
    elapsed,
    quote,
  });
}
