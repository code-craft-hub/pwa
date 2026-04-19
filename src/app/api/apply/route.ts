import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jobApplications, jobPosts, users, userProfiles, userContacts, resumes, coverLetters } from "@/schema/schema"
import { createAutoApplySession, runBotSession, releaseStaleSessionsForUser } from "@/lib/auto-apply"
import type { UserProfile } from "@/lib/auto-apply"
import { eq, and, isNotNull } from "drizzle-orm"

export const runtime = "nodejs"

async function buildUserProfile(userId: string, jobId: string): Promise<UserProfile | null> {
  const [user, profile, contact] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
    db.query.userContacts.findFirst({ where: eq(userContacts.userId, userId) }),
  ])

  if (!user) return null

  // Fetch default resume (prefer profile.defaultResumeId, then isDefault flag)
  let resume = profile?.defaultResumeId
    ? await db.query.resumes.findFirst({ where: eq(resumes.id, profile.defaultResumeId) })
    : await db.query.resumes.findFirst({
        where: and(eq(resumes.userId, userId), eq(resumes.isDefault, true)),
      })

  if (!resume) {
    resume = await db.query.resumes.findFirst({ where: eq(resumes.userId, userId) })
  }

  // Fetch most recent cover letter for this job (or any)
  const coverLetter = await db.query.coverLetters.findFirst({
    where: and(eq(coverLetters.userId, userId), eq(coverLetters.jobId, jobId)),
  }) ?? await db.query.coverLetters.findFirst({
    where: eq(coverLetters.userId, userId),
  })

  const location = [contact?.city, contact?.country].filter(Boolean).join(", ")

  return {
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    email: user.email,
    phone: contact?.phoneNumber ?? undefined,
    location: location || undefined,
    linkedinUrl: resume?.linkedIn ?? undefined,
    githubUrl: resume?.github ?? undefined,
    websiteUrl: resume?.website ?? undefined,
    resumeUrl: resume?.fileUrl ?? undefined,
    resumeText: resume?.rawResumeText ?? undefined,
    coverLetterText: coverLetter?.content ?? undefined,
    summary: profile?.bio ?? resume?.summary ?? undefined,
    workAuthorized: true,
    willingToRelocate: resume?.relocationWillingness ?? undefined,
    salary: resume?.salary ?? undefined,
    availability: resume?.availabilityToStart ?? undefined,
  }
}

export async function POST(req: NextRequest) {
  const { jobId, userId } = (await req.json()) as { jobId: string; userId: string }

  if (!jobId || !userId) {
    return NextResponse.json({ error: "Missing jobId or userId" }, { status: 400 })
  }

  const job = await db.query.jobPosts.findFirst({ where: eq(jobPosts.id, jobId) })
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  const applyUrl = job.applyUrl ?? job.link
  if (!applyUrl) return NextResponse.json({ error: "No apply URL for this job" }, { status: 422 })

  const userProfile = await buildUserProfile(userId, jobId)
  if (!userProfile?.email) {
    return NextResponse.json({ error: "User profile not found or missing email" }, { status: 422 })
  }

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
