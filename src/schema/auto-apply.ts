import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core"
import { jobApplications } from "./schema"

export const autoApplySessions = pgTable("auto_apply_sessions", {
  id: uuid().defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .references(() => jobApplications.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  bbSessionId: text("bb_session_id").notNull(),
  bbLiveUrl: text("bb_live_url"),
  /**
   * initializing → running → awaiting_human → resuming → completed | failed
   */
  status: text("status").notNull().default("initializing"),
  stuckReason: text("stuck_reason"),
  checkpoint: jsonb("checkpoint").$type<{ url: string; step: string }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export type AutoApplySession = typeof autoApplySessions.$inferSelect
export type AutoApplyStatus = "initializing" | "running" | "awaiting_human" | "resuming" | "completed" | "failed"
