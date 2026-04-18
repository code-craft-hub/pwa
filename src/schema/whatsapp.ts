import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── WhatsApp Conversation Contexts Table ────────────────────────────────────
// Durable store for multi-turn conversation state.
// Redis is the primary hot store (TTL=30m); this table provides
// durability across Redis restarts and multi-instance deployments.

export const whatsappConversationContexts = pgTable(
  "whatsapp_conversation_contexts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    phoneNumber: varchar("phone_number", { length: 30 }).notNull(),
    // The classified intent driving this conversation turn
    intent: varchar("intent", { length: 64 }).notNull(),
    // State machine: collecting_data → confirming → processing → completed | cancelled
    status: varchar("status", { length: 32 }).default("collecting_data").notNull(),
    // Accumulated parameters across turns (jsonb for schema flexibility)
    collectedParams: jsonb("collected_params").$type<Record<string, unknown>>().default({}).notNull(),
    // Remaining fields the engine still needs before dispatch
    missingParams: text("missing_params").array().default([]).notNull(),
    // Rolling window of conversation turns for prompt context
    conversationTurns: jsonb("conversation_turns")
      .$type<Array<{ role: "user" | "assistant"; content: string; ts: number }>>()
      .default([])
      .notNull(),
    // Hard expiry — cron cleans up stale rows
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("conv_ctx_user_id_idx").on(table.userId),
    index("conv_ctx_phone_idx").on(table.phoneNumber),
    index("conv_ctx_status_idx").on(table.status),
    index("conv_ctx_expires_at_idx").on(table.expiresAt),
  ],
);

// ─── WhatsApp Chats Table ──────────────────────────────────────────────────

export const whatsappChats = pgTable(
  "whatsapp_chats",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
    contactAvatarUrl: text("contact_avatar_url"),
    whatsappId: varchar("whatsapp_id", { length: 100 }),
    autoApplyCount: integer("auto_apply_count").default(0).notNull(),
    documentsGeneratedCount: integer("documents_generated_count")
      .default(0)
      .notNull(),
    unreadCount: integer("unread_count").default(0).notNull(),
    lastMessage: text("last_message"),
    lastMessageTime: timestamp("last_message_time", {
      withTimezone: true,
      mode: "date",
    }),
    isAiLastMessage: boolean("is_ai_last_message").default(false),
    metadata: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("whatsapp_chats_user_id_idx").on(table.userId),
    index("whatsapp_chats_contact_phone_idx").on(table.contactPhone),
    index("whatsapp_chats_whatsapp_id_idx").on(table.whatsappId),
    index("whatsapp_chats_unread_count_idx").on(table.unreadCount),
    index("whatsapp_chats_updated_at_idx").on(table.updatedAt),
  ],
);

// ─── WhatsApp Messages Table ───────────────────────────────────────────────

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    chatId: uuid("chat_id")
      .references(() => whatsappChats.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    messageType: varchar("message_type", { length: 20 }).default("text"), // "text", "file"
    content: text("content"),
    fileName: varchar("file_name", { length: 255 }),
    filePages: integer("file_pages"),
    fileSize: varchar("file_size", { length: 50 }),
    fileExtension: varchar("file_extension", { length: 10 }),
    fileUrl: text("file_url"),
    isOutgoing: boolean("is_outgoing").default(false).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    isAiGenerated: boolean("is_ai_generated").default(false),
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
    metadata: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
  },
  (table) => [
    index("whatsapp_messages_chat_id_idx").on(table.chatId),
    index("whatsapp_messages_user_id_idx").on(table.userId),
    index("whatsapp_messages_created_at_idx").on(table.createdAt),
    index("whatsapp_messages_is_outgoing_idx").on(table.isOutgoing),
  ],
);

// ─── WhatsApp Stats Table ──────────────────────────────────────────────────

export const whatsappStats = pgTable(
  "whatsapp_stats",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    totalChats: integer("total_chats").default(0).notNull(),
    documentsGenerated: integer("documents_generated").default(0).notNull(),
    autoApplies: integer("auto_applies").default(0).notNull(),
    jobsRecommended: integer("jobs_recommended").default(0).notNull(),
    lastUpdated: timestamp("last_updated", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
  },
  (table) => [
    index("whatsapp_stats_user_id_idx").on(table.userId),
    index("whatsapp_stats_last_updated_idx").on(table.lastUpdated),
  ],
);
