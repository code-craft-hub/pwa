import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

/**
 * Tracks the real-time presence of authenticated users.
 *
 * One row per user (UNIQUE on user_id). The row is UPSERTED on every heartbeat,
 * so `last_seen_at` reflects the most recent client ping. A user is considered
 * "active" if their `last_seen_at` falls within the configured active window
 * (default: 5 minutes).
 *
 * Indexes:
 *  • last_seen_at DESC — primary access pattern for admin active-user queries
 *    (range scan + cursor-based pagination).
 */
export const userPresence = pgTable(
  "user_presence",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),

    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    /** Timestamp of the most recent heartbeat from this user. */
    lastSeenAt: timestamp("last_seen_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),

    /** Next.js pathname the user was on when the heartbeat fired. */
    pagePath: varchar("page_path", { length: 500 }),

    /** Browser/device identifier — stored for admin context, never filtered on. */
    userAgent: text("user_agent"),

    /** Client IP address for geographic context (IPv4 or IPv6). */
    ipAddress: varchar("ip_address", { length: 45 }),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_presence_last_seen_at_idx").using(
      "btree",
      table.lastSeenAt.desc().nullsLast().op("timestamptz_ops"),
    ),
  ],
);
