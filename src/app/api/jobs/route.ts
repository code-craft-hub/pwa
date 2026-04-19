import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jobPosts } from "@/schema/schema"
import { isNotNull, isNull, or, and, desc, ilike, lt, eq } from "drizzle-orm"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)
  const search = searchParams.get("search")?.trim() ?? ""
  const excludeEmail = searchParams.get("excludeEmail") === "1"
  const cursor = searchParams.get("cursor") ?? null

  const conditions = [or(isNotNull(jobPosts.applyUrl), isNotNull(jobPosts.link))]

  if (search) conditions.push(ilike(jobPosts.title, `%${search}%`))
  if (excludeEmail) conditions.push(isNull(jobPosts.emailApply))

  if (cursor) {
    // Find the postedAt of the cursor row, then page from there
    const cursorRow = await db
      .select({ postedAt: jobPosts.postedAt })
      .from(jobPosts)
      .where(eq(jobPosts.id, cursor))
      .limit(1)
    if (cursorRow[0]?.postedAt) {
      conditions.push(lt(jobPosts.postedAt, cursorRow[0].postedAt))
    }
  }

  const rows = await db
    .select({
      id: jobPosts.id,
      title: jobPosts.title,
      companyName: jobPosts.companyName,
      companyLogo: jobPosts.companyLogo,
      location: jobPosts.location,
      emailApply: jobPosts.emailApply,
      employmentType: jobPosts.employmentType,
      postedAt: jobPosts.postedAt,
      applyUrl: jobPosts.applyUrl,
      link: jobPosts.link,
      classification: jobPosts.classification,
    })
    .from(jobPosts)
    .where(and(...conditions))
    .orderBy(desc(jobPosts.postedAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  return NextResponse.json({ items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null })
}
