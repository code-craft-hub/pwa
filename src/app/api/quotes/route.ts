import { NextResponse } from "next/server";
import { getRandomQuote, getQuoteOfTheDay } from "@/lib/quotes";

// Never cache — always fresh quote on every poll
export const dynamic = "force-dynamic";

/**
 * GET /api/quotes
 *
 * Query params:
 *   ?mode=random  (default) — new random quote every call
 *   ?mode=daily   — same quote for the whole day
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "random";

  const quote = mode === "daily" ? getQuoteOfTheDay() : getRandomQuote();

  return NextResponse.json(quote, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Quote-Mode": mode,
    },
  });
}
