import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jobApplications, jobPosts } from "@/schema/schema"
import { createAutoApplySession, runBotSession, releaseStaleSessionsForUser } from "@/lib/auto-apply"
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

  // Stop any stale Browser-Use sessions before starting a new one
  await releaseStaleSessionsForUser(userId)

  // Start Browser-Use task — returns live URL immediately
  const { buSessionId, liveUrl } = await createAutoApplySession(applicationId, applyUrl, userProfile)

  // Fire-and-forget bot loop
  runBotSession(applicationId, userId, job.title ?? "Job", buSessionId).catch(console.error)

  return NextResponse.json({ applicationId, liveUrl })
}
