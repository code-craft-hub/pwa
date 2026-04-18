import "dotenv/config";
import { eq, isNull, notExists, sql } from "drizzle-orm";
import { db, pool } from "../../../config/database";
import { users, activityLog, userActivity } from "../../index";

/**
 * Seed activityLog and userActivity for all users that don't already have records.
 *
 * Rules:
 * - Only insert when no row exists for a given userId in each table.
 * - lastLoginAt fallback: if null, patch to createdAt via a single bulk UPDATE.
 * - activityLog: one "create/user" entry per user.
 * - userActivity: one "login" entry per user reflecting first/last login.
 *
 * Performance: 4 total DB round-trips regardless of user count.
 * Candidate queries + inserts run in parallel.
 */
async function seed() {
  // ── 1. Patch lastLoginAt in one bulk UPDATE — no per-user loop ─────────────
  const patched = await db
    .update(users)
    .set({ lastLoginAt: sql`${users.createdAt}` })
    .where(isNull(users.lastLoginAt))
    .returning({ id: users.id });

  if (patched.length > 0) {
    console.log(`Patched lastLoginAt for ${patched.length} users.`);
  }

  // ── 2. Fetch candidates for both tables in parallel ─────────────────────────
  const [activityLogCandidates, userActivityCandidates] = await Promise.all([
    db
      .select({ id: users.id, createdAt: users.createdAt, updatedAt: users.updatedAt })
      .from(users)
      .where(
        notExists(
          db
            .select({ _: activityLog.id })
            .from(activityLog)
            .where(eq(activityLog.userId, users.id)),
        ),
      ),

    db
      .select({ id: users.id, createdAt: users.createdAt, updatedAt: users.updatedAt, lastLoginAt: users.lastLoginAt })
      .from(users)
      .where(
        notExists(
          db
            .select({ _: userActivity.id })
            .from(userActivity)
            .where(eq(userActivity.userId, users.id)),
        ),
      ),
  ]);

  console.log(
    `Candidates — activityLog: ${activityLogCandidates.length}, userActivity: ${userActivityCandidates.length}`,
  );

  // ── 3. Fire both inserts in parallel ───────────────────────────────────────
  await Promise.all([
    activityLogCandidates.length > 0
      ? db.insert(activityLog).values(
          activityLogCandidates.map((u) => ({
            userId: u.id,
            action: "create",
            entity: "user",
            entityId: u.id,
            description: "Account created (seeded)",
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          })),
        )
      : Promise.resolve(),

    userActivityCandidates.length > 0
      ? db.insert(userActivity).values(
          userActivityCandidates.map((u) => {
            const loginAt = u.lastLoginAt ?? u.createdAt;
            return {
              userId: u.id,
              action: "login",
              page: "/dashboard",
              route: "/dashboard",
              description: "Initial login (seeded)",
              lastActivityAt: loginAt,
              createdAt: loginAt,
              updatedAt: u.updatedAt,
            };
          }),
        )
      : Promise.resolve(),
  ]);

  console.log(
    activityLogCandidates.length > 0
      ? `Inserted ${activityLogCandidates.length} activityLog rows.`
      : "activityLog: all users already have records, skipping.",
  );
  console.log(
    userActivityCandidates.length > 0
      ? `Inserted ${userActivityCandidates.length} userActivity rows.`
      : "userActivity: all users already have records, skipping.",
  );

  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
