import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── User Feedback Table ───────────────────────────────────────────────────────
//
// Stores all user-submitted feedback across three modal surfaces:
//
//  1. "Share Your Feedback" (general product feedback)
//     feedbackType: "product_feedback" | "job_quality" | "resume_cv_generation" |
//                   "bug_report" | "crash_technical_issue" | "other"
//     rating: null  |  resourceType: null  |  resourceId: null
//
//  2. "Job Review" modal (per-job thumbs up/down)
//     feedbackType: "job_review"
//     rating: 1 (Good) | 0 (Not relevant)
//     resourceType: "job_recommendation" | "job_post"
//     resourceId: <job uuid>
//
//  3. "Rate the quality of the CV" modal (1–5 star rating)
//     feedbackType: "cv_quality"
//     rating: 1–5
//     resourceType: "resume"
//     resourceId: <resume uuid>
//
// status workflow: "open" → "in_review" → "resolved" | "closed"

export const userFeedback = pgTable(
  "user_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    // The user who submitted the feedback.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Discriminator for the feedback surface / modal type.
    feedbackType: varchar("feedback_type", { length: 100 }).notNull(),

    // Numerical rating. Interpretation depends on feedbackType:
    //   job_review  → 1 = Good, 0 = Not relevant
    //   cv_quality  → 1–5 (Poor → Excellent)
    //   others      → null
    rating: integer("rating"),

    // The entity this feedback is about (only set for resource-specific modals).
    // resourceType: "job_recommendation" | "job_post" | "resume" | null
    resourceType: varchar("resource_type", { length: 100 }),

    // UUID of the resource being rated (job or resume ID). Stored as varchar
    // so it works with both Firebase and PostgreSQL UUID formats.
    resourceId: varchar("resource_id", { length: 255 }),

    // The free-text details the user entered.
    details: text("details"),

    // Workflow: "open" | "in_review" | "resolved" | "closed"
    status: varchar("status", { length: 50 }).default("open").notNull(),

    // Optional extra context (e.g. page URL, browser, app version).
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("uf_user_id_idx").using("btree", table.userId),
    index("uf_feedback_type_idx").using("btree", table.feedbackType),
    index("uf_status_idx").using("btree", table.status),
    index("uf_created_at_idx").using("btree", table.createdAt),
    // Efficient lookup of all feedback for a given resource (e.g. all reviews for a job).
    index("uf_resource_idx").using("btree", table.resourceType, table.resourceId),
  ],
);

export type UserFeedback = typeof userFeedback.$inferSelect;
export type NewUserFeedback = typeof userFeedback.$inferInsert;
