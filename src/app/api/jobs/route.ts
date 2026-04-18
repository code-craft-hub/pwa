import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jobPosts } from "@/schema/schema"
import { isNotNull, or, desc } from "drizzle-orm"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)

  const rows = await db
    .select({
      id: jobPosts.id,
      title: jobPosts.title,
      companyName: jobPosts.companyName,
      companyLogo: jobPosts.companyLogo,
      location: jobPosts.location,
      employmentType: jobPosts.employmentType,
      postedAt: jobPosts.postedAt,
      applyUrl: jobPosts.applyUrl,
      link: jobPosts.link,
      classification: jobPosts.classification,
    })
    .from(jobPosts)
    .where(
      or(isNotNull(jobPosts.applyUrl), isNotNull(jobPosts.link)),
    )
    .orderBy(desc(jobPosts.postedAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({ items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null })
}
