import { NextRequest, NextResponse } from "next/server";
import {
  addSubscription,
  removeSubscription,
  getSubscriptionCount,
} from "@/lib/subscriptions";
import type { PushSubscription as WebPushSubscription } from "web-push";

/**
 * POST /api/push/subscribe
 * Body: PushSubscription JSON (from pushManager.subscribe())
 *
 * Stores the subscription so the cron job can push to it.
 */
export async function POST(request: NextRequest) {
  let subscription: WebPushSubscription;

  try {
    subscription = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid subscription payload" },
      { status: 400 }
    );
  }

  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json(
      { error: "Subscription must include endpoint and keys" },
      { status: 400 }
    );
  }

  addSubscription(subscription);

  console.log(
    `[push/subscribe] Subscriber added. Total: ${getSubscriptionCount()}`
  );

  return NextResponse.json(
    { success: true, total: getSubscriptionCount() },
    { status: 201 }
  );
}

/**
 * DELETE /api/push/subscribe
 * Body: { endpoint: string }
 *
 * Removes the subscription (user unsubscribed).
 */
export async function DELETE(request: NextRequest) {
  let body: { endpoint?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json(
      { error: "Missing endpoint in body" },
      { status: 400 }
    );
  }

  removeSubscription(body.endpoint);

  console.log(
    `[push/subscribe] Subscriber removed. Total: ${getSubscriptionCount()}`
  );

  return NextResponse.json({ success: true, total: getSubscriptionCount() });
}
