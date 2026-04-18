import "dotenv/config";
import { notExists, eq } from "drizzle-orm";
import { db, pool } from "../../../config/database";
import { users, userIssues } from "../../index";

/**
 * Seed user_issues for all users that have no existing rows.
 *
 * Each qualifying user gets 1–3 randomly selected issue types assigned,
 * with a random severity (1–5). The unique index on (userId, issueType)
 * is respected — we never insert duplicate issue types per user.
 *
 * Performance: 2 DB round-trips regardless of user count.
 */

const ISSUE_TYPES = [
  "finding_jobs",
  "ai_personalization",
  "job_tracking",
  "ai_job_matching",
  "cover_letter_generation",
  "resume_tailoring",
] as const;

type IssueType = (typeof ISSUE_TYPES)[number];

function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomSeverity(): number {
  return Math.floor(Math.random() * 5) + 1;
}

async function seed() {
  // ── 1. Find users with no user_issues rows ───────────────────────────────
  const candidates = await db
    .select({ id: users.id })
    .from(users)
    .where(
      notExists(
        db
          .select({ _: userIssues.id })
          .from(userIssues)
          .where(eq(userIssues.userId, users.id)),
      ),
    );

  console.log(`Candidates with no user_issues: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log("All users already have issue records, skipping.");
    return;
  }

  // ── 2. Build rows — 1 to 3 random issue types per user ──────────────────
  const rows: {
    userId: string;
    issueType: IssueType;
    severity: number;
    otherIssueDetails: string | null;
  }[] = [];

  for (const user of candidates) {
    const count = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    const picked = pickRandom(ISSUE_TYPES, count);

    for (const issueType of picked) {
      rows.push({
        userId: user.id,
        issueType,
        severity: randomSeverity(),
        otherIssueDetails: null,
      });
    }
  }

  // ── 3. Bulk insert ────────────────────────────────────────────────────────
  await db.insert(userIssues).values(rows);

  console.log(
    `Inserted ${rows.length} user_issues rows for ${candidates.length} users.`,
  );
  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
