import {
  pgTable,
  pgEnum,
  uuid,
  bigint,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { users } from "./schema";


const auditTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date()),
};

export const paystackCustomers = pgTable(
  "paystack_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paystackId: integer("paystack_id").notNull(),
    customerCode: varchar("customer_code", { length: 64 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 32 }),
    internationalFormatPhone: varchar("international_format_phone", {
      length: 32,
    }),
    riskAction: varchar("risk_action")
      .notNull()
      .default("default"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...auditTimestamps,
  },
  (t) => [
    uniqueIndex("paystack_customers_customer_code_uidx").on(t.customerCode),
    uniqueIndex("paystack_customers_paystack_id_uidx").on(t.paystackId),
    index("paystack_customers_email_idx").on(t.email),
  ],
);

export const paystackAuthorizations = pgTable(
  "paystack_authorizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorizationCode: varchar("authorization_code", { length: 64 }).notNull(),
    channel: varchar("channel").notNull(),
    bin: varchar("bin", { length: 16 }),
    last4: varchar("last4", { length: 8 }),
    expMonth: varchar("exp_month", { length: 2 }),
    expYear: varchar("exp_year", { length: 4 }),
    brand: varchar("brand", { length: 64 }),
    cardType: varchar("card_type", { length: 32 }),
    bank: varchar("bank", { length: 128 }),
    countryCode: varchar("country_code", { length: 2 }),
    reusable: boolean("reusable").notNull().default(false),
    signature: varchar("signature", { length: 128 }),
    accountName: varchar("account_name", { length: 128 }),
    narration: text("narration"),
    receiverBank: varchar("receiver_bank", { length: 128 }),
    receiverBankAccountNumber: varchar("receiver_bank_account_number", {
      length: 32,
    }),
    senderBank: varchar("sender_bank", { length: 128 }),
    senderBankAccountNumber: varchar("sender_bank_account_number", {
      length: 32,
    }),
    senderCountry: varchar("sender_country", { length: 2 }),
    senderName: varchar("sender_name", { length: 256 }),
    ...auditTimestamps,
  },
  (t) => [
    uniqueIndex("paystack_authorizations_auth_code_uidx").on(
      t.authorizationCode,
    ),
    index("paystack_authorizations_channel_idx").on(t.channel),
    index("paystack_authorizations_reusable_idx")
      .on(t.reusable)
      .where(sql`${t.reusable} = true`),
  ],
);

export const paystackTransactions = pgTable(
  "paystack_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").notNull(),
    authorizationId: uuid("authorization_id"),
    paystackId: bigint("paystack_id", { mode: "number" }).notNull(),
    reference: varchar("reference", { length: 128 }).notNull(),
    amount: integer("amount").notNull(),
    requestedAmount: integer("requested_amount").notNull(),
    fees: integer("fees").notNull().default(0),
    currency: varchar("currency").notNull().default("NGN"),
    status: varchar("status").notNull().default("pending"),
    domain: varchar("domain").notNull().default("live"),
    gatewayResponse: varchar("gateway_response", { length: 128 }),
    channel: varchar("channel").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    paystackCreatedAt: timestamp("paystack_created_at", {
      withTimezone: true,
      precision: 3,
    }),
    paidAt: timestamp("paid_at", { withTimezone: true, precision: 3 }),
    transactionDate: timestamp("transaction_date", {
      withTimezone: true,
      precision: 3,
    }),
    log: jsonb("log"),
    feesBreakdown: jsonb("fees_breakdown"),
    metadata: jsonb("metadata"),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
    split: jsonb("split").$type<Record<string, unknown>>(),
    subaccount: jsonb("subaccount").$type<Record<string, unknown>>(),
    planObject: jsonb("plan_object").$type<Record<string, unknown>>(),
    receiptNumber: varchar("receipt_number", { length: 64 }),
    connect: jsonb("connect").$type<Record<string, unknown>>(),
    source: jsonb("source").$type<Record<string, unknown>>(),
    modifiedBy: uuid("modified_by"),
    ...auditTimestamps,
  },
  (t) => [
    uniqueIndex("paystack_txn_reference_uidx").on(t.reference),
    uniqueIndex("paystack_txn_paystack_id_uidx").on(t.paystackId),
    index("paystack_txn_user_id_idx").on(t.userId),
    index("paystack_txn_customer_id_idx").on(t.customerId),
    index("paystack_txn_authorization_id_idx").on(t.authorizationId),
    index("paystack_txn_user_status_paid_at_idx").on(
      t.userId,
      t.status,
      t.paidAt,
    ),
    index("paystack_txn_user_success_idx")
      .on(t.userId, t.paidAt)
      .where(sql`${t.status} = 'success'`),
    index("paystack_txn_pending_idx")
      .on(t.createdAt)
      .where(sql`${t.status} IN ('pending', 'abandoned')`),
    index("paystack_txn_email_idx").on(t.email),
    index("paystack_txn_channel_status_idx").on(t.channel, t.status),
    index("paystack_txn_metadata_gin_idx").using("gin", t.metadata),
  ],
);

export const paystackWebhookEventStatusEnum = pgEnum(
  "paystack_webhook_event_status",
  ["received", "processing", "processed", "failed", "ignored"],
);

export const paystackWebhookEvents = pgTable(
  "paystack_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: varchar("event", { length: 64 }).notNull(),
    reference: varchar("reference", { length: 128 }),
    paystackId: bigint("paystack_id", { mode: "number" }),
    status: paystackWebhookEventStatusEnum("status")
      .notNull()
      .default("received"),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    processingError: text("processing_error"),
    sourceIp: varchar("source_ip", { length: 45 }),
    attempts: integer("attempts").notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      precision: 3,
    }),
    ...auditTimestamps,
  },
  (t) => [
    uniqueIndex("paystack_webhook_paystack_id_event_uidx").on(
      t.paystackId,
      t.event,
    ),
    index("paystack_webhook_reference_idx").on(t.reference),
    index("paystack_webhook_event_type_idx").on(t.event),
    index("paystack_webhook_unprocessed_idx")
      .on(t.receivedAt)
      .where(sql`${t.status} IN ('received', 'processing', 'failed')`),
    index("paystack_webhook_status_idx").on(t.status),
  ],
);

export const paystackTransactionsRelations = relations(
  paystackTransactions,
  ({ one }) => ({
    customer: one(paystackCustomers, {
      fields: [paystackTransactions.customerId],
      references: [paystackCustomers.id],
    }),
    authorization: one(paystackAuthorizations, {
      fields: [paystackTransactions.authorizationId],
      references: [paystackAuthorizations.id],
    }),
  }),
);

export const paystackCustomersRelations = relations(
  paystackCustomers,
  ({ many }) => ({
    transactions: many(paystackTransactions),
  }),
);

export const paystackAuthorizationsRelations = relations(
  paystackAuthorizations,
  ({ many }) => ({
    transactions: many(paystackTransactions),
  }),
);

export type PaystackTransaction = typeof paystackTransactions.$inferSelect;
export type NewPaystackTransaction = typeof paystackTransactions.$inferInsert;

export type PaystackCustomer = typeof paystackCustomers.$inferSelect;
export type NewPaystackCustomer = typeof paystackCustomers.$inferInsert;

export type PaystackAuthorization = typeof paystackAuthorizations.$inferSelect;
export type NewPaystackAuthorization =
  typeof paystackAuthorizations.$inferInsert;

export type PaystackWebhookEvent = typeof paystackWebhookEvents.$inferSelect;
export type NewPaystackWebhookEvent = typeof paystackWebhookEvents.$inferInsert;
