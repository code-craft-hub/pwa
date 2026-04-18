import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jobApplications, jobPosts } from "@/schema/schema"
import { createAutoApplySession, runBotSession } from "@/lib/auto-apply"
import type { UserProfile } from "@/lib/auto-apply"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const { jobId, userId, userProfile } = (await req.json()) as {
    jobId: string
    userId: string
    userProfile: UserProfile
  }

  if (!jobId || !userId || !userProfile?.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const job = await db.query.jobPosts.findFirst({ where: eq(jobPosts.id, jobId) })
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  const applyUrl = job.applyUrl ?? job.link
  if (!applyUrl) return NextResponse.json({ error: "No apply URL for this job" }, { status: 422 })

  // Upsert application record
  const existing = await db.query.jobApplications.findFirst({
    where: eq(jobApplications.jobId, jobId),
  })

  let applicationId: string
  if (existing) {
    applicationId = existing.id
  } else {
    const [app] = await db
      .insert(jobApplications)
      .values({ userId, jobId, status: "submitted", autoApplied: true, aiGenerated: false, aiTailored: false })
      .returning()
    applicationId = app.id
  }

  // Init Stagehand + Browserbase session — returns live URL immediately
  const { liveUrl, stagehand } = await createAutoApplySession(applicationId, applyUrl, userProfile)

  // Fire-and-forget bot loop (stagehand already init'd, passed through)
  runBotSession(applicationId, applyUrl, userProfile, userId, job.title ?? "Job", stagehand).catch(console.error)

  return NextResponse.json({ applicationId, liveUrl })
}
