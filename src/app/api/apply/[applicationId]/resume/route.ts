import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { autoApplySessions } from "@/schema/auto-apply"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

// POST /api/apply/[applicationId]/resume — user signals they finished manual intervention
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params

  const session = await db.query.autoApplySessions.findFirst({
    where: eq(autoApplySessions.applicationId, applicationId),
  })

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })
  if (session.status !== "awaiting_human") {
    return NextResponse.json({ error: "Session is not awaiting human intervention" }, { status: 409 })
  }

  await db
    .update(autoApplySessions)
    .set({ status: "resuming", updatedAt: new Date() })
    .where(eq(autoApplySessions.applicationId, applicationId))

  return NextResponse.json({ ok: true })
}
