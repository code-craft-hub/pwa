import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { autoApplySessions } from "@/schema/auto-apply"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

const BU_API = "https://api.browser-use.com/api/v3"
const BU_KEY = () => process.env.BROWSER_USE_API_KEY!

interface BuMessage {
  id: string
  summary: string | null
  screenshot_url: string | null
}

async function fetchLatestStep(buSessionId: string, afterCursor: string | null): Promise<{
  message: BuMessage | null
  lastStepSummary: string | null
  nextCursor: string | null
}> {
  try {
    const params = new URLSearchParams({ limit: "5" })
    if (afterCursor) params.set("after", afterCursor)

    const [msgRes, sessionRes] = await Promise.all([
      fetch(`${BU_API}/sessions/${buSessionId}/messages?${params}`, {
        headers: { "X-Browser-Use-API-Key": BU_KEY() },
      }),
      fetch(`${BU_API}/sessions/${buSessionId}`, {
        headers: { "X-Browser-Use-API-Key": BU_KEY() },
      }),
    ])

    const messages: BuMessage[] = msgRes.ok ? ((await msgRes.json()) as BuMessage[]) : []
    const session = sessionRes.ok ? await sessionRes.json() : null

    const latest = messages.length > 0 ? messages[messages.length - 1] : null
    const nextCursor = latest?.id ?? afterCursor

    return {
      message: latest,
      lastStepSummary: session?.lastStepSummary ?? null,
      nextCursor,
    }
  } catch {
    return { message: null, lastStepSummary: null, nextCursor: afterCursor }
  }
}

// GET /api/apply/[applicationId] — SSE stream with live bot screenshots + step summaries
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      const TERMINAL = new Set(["completed", "failed"])
      let msgCursor: string | null = null

      for (;;) {
        const session = await db.query.autoApplySessions
          .findFirst({ where: eq(autoApplySessions.applicationId, applicationId) })
          .catch(() => null)

        if (!session) {
          send({ status: "not_found" })
          break
        }

        let lastStepSummary: string | null = null
        let screenshotUrl: string | null = null

        if (session.status === "running" || session.status === "resuming") {
          const step = await fetchLatestStep(session.bbSessionId, msgCursor)
          lastStepSummary = step.lastStepSummary
          screenshotUrl = step.message?.screenshot_url ?? null
          if (step.nextCursor) msgCursor = step.nextCursor
        }

        send({
          status: session.status,
          stuckReason: session.stuckReason,
          bbLiveUrl: session.bbLiveUrl,
          checkpoint: session.checkpoint,
          lastStepSummary,
          screenshotUrl,
          updatedAt: session.updatedAt,
        })

        if (TERMINAL.has(session.status)) break

        await new Promise((r) => setTimeout(r, 2000))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
