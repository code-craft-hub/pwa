import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { autoApplySessions } from "@/schema/auto-apply"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

// GET /api/apply/[applicationId] — SSE stream of bot status updates
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

      for (;;) {
        const session = await db.query.autoApplySessions
          .findFirst({ where: eq(autoApplySessions.applicationId, applicationId) })
          .catch(() => null)

        if (!session) {
          send({ status: "not_found" })
          break
        }

        send({
          status: session.status,
          stuckReason: session.stuckReason,
          bbLiveUrl: session.bbLiveUrl,
          checkpoint: session.checkpoint,
          updatedAt: session.updatedAt,
        })

        if (TERMINAL.has(session.status)) break

        await new Promise((r) => setTimeout(r, 2500))
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
