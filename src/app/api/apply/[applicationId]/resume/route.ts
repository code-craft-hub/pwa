import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { autoApplySessions } from "@/schema/auto-apply"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

const BU_API = "https://api.browser-use.com/api/v3"
const BU_KEY = () => process.env.BROWSER_USE_API_KEY!

async function stopBuTask(sessionId: string) {
  await fetch(`${BU_API}/sessions/${sessionId}/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Browser-Use-API-Key": BU_KEY() },
    body: JSON.stringify({ strategy: "task" }),
  }).catch(() => {})
}

// POST /api/apply/[applicationId]/resume — user signals they finished manual intervention.
// Accepts both "awaiting_human" (bot paused itself) and "running" (user forced takeover).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params

  const session = await db.query.autoApplySessions.findFirst({
    where: eq(autoApplySessions.applicationId, applicationId),
  })

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  const { status } = session
  if (status !== "awaiting_human" && status !== "running") {
    return NextResponse.json(
      { error: `Cannot resume from status "${status}"` },
      { status: 409 },
    )
  }

  // If the bot task is still running, stop it gracefully (keeps the browser session alive)
  if (status === "running") {
    await stopBuTask(session.bbSessionId)
  }

  await db
    .update(autoApplySessions)
    .set({ status: "resuming", updatedAt: new Date() })
    .where(eq(autoApplySessions.applicationId, applicationId))

  return NextResponse.json({ ok: true })
}
