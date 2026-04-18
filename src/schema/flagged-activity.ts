import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  varchar,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── Flagged Activities Table ──────────────────────────────────────────────────
//
// Trust & Safety incident log. One row per flagged event.
//
// Workflow:
//   pending → under_review → escalated? → resolved | dismissed | false_positive
//
// Enums (status, severity, source, activityType, resolutionType) are
// intentionally left as varchar — add pgEnum constraints in a later migration.

export const flaggedActivities = pgTable(
  "flagged_activities",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),

    // ── Subject ──────────────────────────────────────────────────────────────
    // The user whose behaviour was flagged.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // ── Classification ────────────────────────────────────────────────────────
    // activityType: "spam" | "abuse" | "fraud" | "brute_force" |
    //   "rate_limit_exceeded" | "scraping" | "tos_violation" |
    //   "suspicious_login" | "account_takeover" | "fake_account" | …
    activityType: varchar("activity_type"),

    // severity: "low" | "medium" | "high" | "critical"
    // Drives SLA: critical=1h, high=4h, medium=24h, low=72h
    severity: varchar("severity").default("medium"),

    // status: "pending" | "under_review" | "escalated" |
    //         "resolved" | "dismissed" | "false_positive"
    status: varchar("status").default("pending"),

    // priority: 1 (lowest) → 100 (highest) — fine-grained queue ordering
    // within the same severity bucket. Computed by the detection engine.
    priority: integer("priority").default(50),

    // riskScore: 0.0 – 100.0 — ML / rule-engine confidence signal.
    riskScore: real("risk_score"),

    // ── Detection source ──────────────────────────────────────────────────────
    // source: "rule_engine" | "ai" | "user_report" | "manual" | "third_party"
    source: varchar("source"),

    // Which rule / model fired, and its pinned version (for audit & retraining).
    ruleName: varchar("rule_name"),
    ruleVersion: varchar("rule_version"),

    // ── Request context at event time ─────────────────────────────────────────
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),

    // The session that was active when the activity occurred.
    // set null on session deletion keeps the incident record intact.
    sessionId: uuid("session_id"),

    // ── Affected resource ─────────────────────────────────────────────────────
    // The object the actor acted on. e.g. "job_post", "message", "resume".
    affectedResourceType: varchar("affected_resource_type"),
    affectedResourceId: uuid("affected_resource_id"),

    // ── Human-readable context ────────────────────────────────────────────────
    // Free-text summary written by the detection rule or reporting analyst.
    context: text("context"),

    // Arbitrary key-value bag: request body snapshot, rule thresholds hit, etc.
    metadata: jsonb("metadata"),

    // ── Analyst routing ───────────────────────────────────────────────────────
    // Free-form labels for routing to specialist queues.
    // e.g. ["pii", "minor", "repeat_offender"]
    tags: jsonb("tags").$type<string[]>().default([]),

    // Confirmed false positive flag — stored separately from status so that
    // ML pipelines can filter on it without touching the workflow status column.
    falsePositive: boolean("false_positive").default(false),

    // ── Timing ───────────────────────────────────────────────────────────────
    // When the underlying user action actually occurred. May differ from
    // createdAt if detection runs asynchronously or is backfilled from logs.
    activityTime: timestamp("activity_time", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    // ── Review step (T1 analyst) ──────────────────────────────────────────────
    // Review is distinct from resolution: a T1 analyst can review and add notes
    // without having authority to resolve (e.g. needs manager sign-off).
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "date",
    }),
    reviewNotes: text("review_notes"),

    // ── Escalation (T2 / legal / security team) ───────────────────────────────
    escalatedTo: uuid("escalated_to").references(() => users.id, {
      onDelete: "set null",
    }),
    escalatedAt: timestamp("escalated_at", {
      withTimezone: true,
      mode: "date",
    }),
    escalationReason: text("escalation_reason"),

    // ── Resolution ────────────────────────────────────────────────────────────
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", {
      withTimezone: true,
      mode: "date",
    }),
    // resolutionType: "warned" | "suspended" | "banned" | "account_restricted"
    //               | "no_action" | "referred_to_law_enforcement"
    resolutionType: varchar("resolution_type"),
    resolutionNote: text("resolution_note"),

    // ── Ordered audit trail ───────────────────────────────────────────────────
    // Append-only log of every action taken on this incident.
    // Shape: { action, actorId, timestamp, note? }[]
    actionsTaken: jsonb("actions_taken")
      .$type<
        {
          action: string;
          actorId: string;
          timestamp: string;
          note?: string;
        }[]
      >()
      .default([]),

    // Compliance requirement: track every notification dispatched.
    // Shape: { channel, recipient, sentAt, templateId? }[]
    notificationsSent: jsonb("notifications_sent")
      .$type<
        {
          channel: string;
          recipient: string;
          sentAt: string;
          templateId?: string;
        }[]
      >()
      .default([]),

    // UUIDs of other flagged_activities rows that belong to the same incident.
    relatedActivityIds: jsonb("related_activity_ids")
      .$type<string[]>()
      .default([]),

    // ── Soft-delete + timestamps ──────────────────────────────────────────────
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    // ── Core lookups ──────────────────────────────────────────────────────────
    index("fa_user_id_idx").using("btree", table.userId),
    index("fa_activity_type_idx").using("btree", table.activityType),
    index("fa_status_idx").using("btree", table.status),
    index("fa_severity_idx").using("btree", table.severity),
    index("fa_source_idx").using("btree", table.source),
    index("fa_activity_time_idx").using("btree", table.activityTime),
    index("fa_created_at_idx").using("btree", table.createdAt),

    // ── Analyst queue ─────────────────────────────────────────────────────────
    // Primary index used by the work queue: filter by status, then sort by
    // severity + priority for correct triage ordering.
    index("fa_queue_idx").using(
      "btree",
      table.status,
      table.severity,
      table.priority,
    ),

    // ── Analyst / resolver lookups ────────────────────────────────────────────
    index("fa_reviewed_by_idx").using("btree", table.reviewedBy),
    index("fa_resolved_by_idx").using("btree", table.resolvedBy),
    index("fa_escalated_to_idx").using("btree", table.escalatedTo),

    // ── Fraud / bot correlation ───────────────────────────────────────────────
    // "How many flags came from this IP?" is a common abuse-detection query.
    index("fa_ip_address_idx").using("btree", table.ipAddress),

    // ── ML pipeline support ───────────────────────────────────────────────────
    index("fa_false_positive_idx").using("btree", table.falsePositive),
    index("fa_rule_name_idx").using("btree", table.ruleName),

    // ── Resource-level lookups ────────────────────────────────────────────────
    // "All flags on this job post / message / resume"
    index("fa_affected_resource_idx").using(
      "btree",
      table.affectedResourceType,
      table.affectedResourceId,
    ),

    // ── Soft-delete filter ────────────────────────────────────────────────────
    index("fa_deleted_at_idx").using("btree", table.deletedAt),
  ],
);

export type FlaggedActivity = typeof flaggedActivities.$inferSelect;
export type NewFlaggedActivity = typeof flaggedActivities.$inferInsert;
