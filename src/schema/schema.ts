import {
  pgTable,
  index,
  foreignKey,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  jsonb,
  unique,
  real,
  integer,
  date,
  doublePrecision,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const accountStatus = pgEnum("account_status", [
  "active",
  "inactive",
  "suspended",
  "pending_verification",
  "locked",
]);
export const applicationStatus = pgEnum("application_status", [
  "draft",
  "submitted",
  "under_review",
  "interviewing",
  "offered",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
  /** Automation paused — awaiting human intervention (CAPTCHA, email verify, etc.) */
  "awaiting_human",
]);
export const applicationType = pgEnum("application_type", [
  "form",
  "email",
  "in_person",
  "company_website",
  "other",
]);
export const authProvider = pgEnum("auth_provider", [
  "email",
  "google",
  "github",
  "linkedin",
  "apple",
  "microsoft",
]);
export const billingInterval = pgEnum("billing_interval", [
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
]);
export const currency = pgEnum("currency", [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "INR",
  "NGN",
]);
export const degreeType = pgEnum("degree_type", [
  "high_school",
  "associate",
  "bachelor",
  "master",
  "doctorate",
  "professional",
  "certification",
]);
export const jobType = pgEnum("job_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "volunteer",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "canceled",
]);
export const subscriptionPlan = pgEnum("subscription_plan", [
  "free",
  "starter",
  "professional",
  "enterprise",
  "custom",
]);
export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);
export const userRole = pgEnum("user_role", [
  "user",
  "admin",
  "super_admin",
  "moderator",
  "support",
]);

export const workLocation = pgEnum("work_location", [
  "onsite",
  "remote",
  "hybrid",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "internship",
]);

export const discoverySourceTypeEnum = pgEnum("discovery_source_type", [
  "linkedin",
  "instagram",
  "tiktok",
  "google",
  "friend",
  "whatsapp",
  "twitter",
  "telegram",
  "other",
]);

export const userIssueTypeEnum = pgEnum("user_issue_type", [
  "finding_jobs",
  "ai_personalization",
  "job_tracking",
  "ai_job_matching",
  "cover_letter_generation",
  "resume_tailoring",
  "other",
]);

export const teamRoleEnum = pgEnum("team_role", ["owner", "admin", "member"]);

export const jobApplications = pgTable(
  "job_applications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id"),
    recommendationId: uuid("recommendation_id"),
    resumeId: uuid("resume_id"),
    coverLetterId: uuid("cover_letter_id"),
    status: varchar({ length: 50 }).notNull(),
    recruiterEmail: text("recruiter_email"),
    errorMessage: text("error_message"),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    statusUpdatedAt: timestamp("status_updated_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),

    applicationUrl: text("application_url"),
    confirmationNumber: varchar("confirmation_number", { length: 100 }),
    respondedAt: timestamp("responded_at", {
      withTimezone: true,
      mode: "string",
    }),
    interviewAt: timestamp("interview_at", {
      withTimezone: true,
      mode: "string",
    }),
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    aiTailored: boolean("ai_tailored").default(false).notNull(),
    autoApplied: boolean("auto_applied").default(false).notNull(),
    notes: text(),
    followUpDate: timestamp("follow_up_date", {
      withTimezone: true,
      mode: "string",
    }),
    externalApplicationId: varchar("external_application_id", { length: 255 }),
    snapshot: jsonb("snapshot"),
  },
  (table) => [
    index("job_applications_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_applications_recommendation_id_idx").using(
      "btree",
      table.recommendationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_applications_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("job_applications_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("job_applications_user_job_unique_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("applications_applied_at_idx").using(
      "btree",
      table.appliedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("applications_user_status_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("idx_job_applications_user_job_active")
      .using(
        "btree",
        table.userId.asc().nullsLast().op("uuid_ops"),
        table.jobId.asc().nullsLast().op("uuid_ops"),
      )
      .where(sql`deleted_at IS NULL`),
    foreignKey({
      columns: [table.coverLetterId],
      foreignColumns: [coverLetters.id],
      name: "job_applications_cover_letter_id_cover_letters_id_fk",
    }),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_applications_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.recommendationId],
      foreignColumns: [jobRecommendations.id],
      name: "job_applications_recommendation_id_job_recommendations_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "job_applications_resume_id_resumes_id_fk",
    }).onDelete("set null"),
  ],
);

export const jobPosts = pgTable(
  "job_posts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    link: text(),
    title: text(),
    companyName: text("company_name"),
    companyLogo: text("company_logo"),
    location: text(),
    salaryInfo: jsonb("salary_info"),
    postedAt: date("posted_at"),
    descriptionHtml: text("description_html"),
    applyUrl: text("apply_url"),
    descriptionText: text("description_text"),
    jobFunction: text("job_function"),
    employmentType: text("employment_type"),
    expireAt: date("expire_at"),
    emailApply: text("email_apply"),
    source: text(),
    payload: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    isProcessed: boolean("is_processed").default(false).notNull(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    qualityScore: real("quality_score"),
    completenessScore: real("completeness_score"),
    fts: tsvector("fts").generatedAlwaysAs(
      sql`(((setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(job_function, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(company_name, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(description_text, ''::text)), 'C'::"char"))`,
    ),
    ftsTitle: tsvector("fts_title").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, COALESCE(title, ''::text))`,
    ),
    ftsDescriptionText: tsvector("fts_description_text").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, COALESCE(description_text, ''::text))`,
    ),
    titleLower: text("title_lower").generatedAlwaysAs(sql`lower(title)`),
    descriptionTextLower: text("description_text_lower").generatedAlwaysAs(
      sql`lower(description_text)`,
    ),
    locationLower: text("location_lower").generatedAlwaysAs(
      sql`lower(location)`,
    ),
    /**
     * Scraper-derived country name, e.g. "Nigeria", "United States".
     * Used for exact-match country filtering (eq, not ILIKE) — O(index) cost.
     */
    localizedTo: text("localized_to"),
    /**
     * Scraper-derived job classification.
     * null  = standard on-site posting
     * "remote"   = explicitly remote
     * "relocate" = relocation required / offered
     */
    classification: text("classification"),
  },
  (table) => [
    index("idx_fts_description_text").using(
      "gin",
      table.ftsDescriptionText.asc().nullsLast().op("tsvector_ops"),
    ),
    index("idx_fts_title").using(
      "gin",
      table.ftsTitle.asc().nullsLast().op("tsvector_ops"),
    ),
    index("idx_job_posts_fts").using(
      "gin",
      table.fts.asc().nullsLast().op("tsvector_ops"),
    ),
    index("job_posts_active_jobs_idx").using(
      "btree",
      table.expireAt.desc().nullsLast().op("date_ops"),
      table.postedAt.desc().nullsLast().op("date_ops"),
      table.employmentType.asc().nullsLast().op("text_ops"),
    ),
    index("job_posts_company_name_idx").using(
      "btree",
      table.companyName.asc().nullsLast().op("text_ops"),
    ),
    index("job_posts_description_text_lower_trgm_idx").using(
      "gin",
      table.descriptionTextLower.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("job_posts_employment_type_idx").using(
      "btree",
      table.employmentType.asc().nullsLast().op("text_ops"),
    ),
    index("job_posts_expire_at_idx").using(
      "btree",
      table.expireAt.desc().nullsLast().op("date_ops"),
    ),
    index("job_posts_is_processed_idx").using(
      "btree",
      table.isProcessed.asc().nullsLast().op("bool_ops"),
      table.createdAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("job_posts_link_idx").using(
      "btree",
      table.link.asc().nullsLast().op("text_ops"),
    ),
    index("job_posts_location_idx").using(
      "gin",
      table.location.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("job_posts_location_lower_trgm_idx").using(
      "gin",
      table.locationLower.asc().nullsLast().op("gin_trgm_ops"),
    ),
    index("job_posts_posted_at_idx").using(
      "btree",
      table.postedAt.desc().nullsLast().op("date_ops"),
    ),
    index("job_posts_posted_expire_idx").using(
      "btree",
      table.postedAt.desc().nullsLast().op("date_ops"),
      table.expireAt.desc().nullsLast().op("date_ops"),
    ),
    index("job_posts_quality_score_idx").using(
      "btree",
      table.qualityScore.desc().nullsLast().op("float4_ops"),
    ),
    index("job_posts_title_lower_trgm_idx").using(
      "gin",
      table.titleLower.asc().nullsLast().op("gin_trgm_ops"),
    ),
    // Keyset pagination index used by searchJobs (browse path, title tier,
    // and full tier). The sort order here MUST match fetchJobRows ORDER BY
    // exactly — changing either will break cursor portability.
    //
    // expireAt is added as an INCLUDE column so PostgreSQL can evaluate the
    // (expireAt IS NULL OR expireAt > now()) filter directly from the index
    // leaf page without a heap fetch, making the browse path an index-only
    // scan. It is NOT a sort key — the B-tree sort order is unchanged.
    //
    // Drizzle does not expose INCLUDE natively on this builder; apply the
    // INCLUDE column in the migration with raw SQL:
    //   CREATE INDEX CONCURRENTLY idx_job_posts_posted_at_id_keyset
    //     ON job_posts (posted_at DESC NULLS LAST, id DESC)
    //     INCLUDE (expire_at);
    index("idx_job_posts_posted_at_id_keyset").using(
      "btree",
      table.postedAt.desc().nullsLast().op("date_ops"),
      table.id.desc().nullsLast().op("uuid_ops"),
    ),
    // Country filter index — supports the exact-match localizedTo param.
    index("job_posts_localized_to_idx").using(
      "btree",
      table.localizedTo.asc().nullsLast().op("text_ops"),
    ),
    index("job_posts_classification_idx").using(
      "btree",
      table.classification.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const bookmarkedJobs = pgTable(
  "bookmarked_jobs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id").notNull(),
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
    index("bookmarked_jobs_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("bookmarked_jobs_unique_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("bookmarked_jobs_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_bookmarked_jobs_user_job_active")
      .using(
        "btree",
        table.userId.asc().nullsLast().op("uuid_ops"),
        table.jobId.asc().nullsLast().op("uuid_ops"),
      )
      .where(sql`deleted_at IS NULL`),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "bookmarked_jobs_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ],
);

export const interviewQuestions = pgTable(
  "interview_questions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id"),
    question: text(),
    fullName: text("full_name"),
    title: text("title"),
    answer: text(),
    category: varchar({ length: 100 }),
    difficulty: varchar({ length: 50 }),
    aiGenerated: boolean("ai_generated").default(true),
    aiSuggestedAnswer: text("ai_suggested_answer"),
    practiceCount: integer("practice_count").default(0),
    lastPracticedAt: timestamp("last_practiced_at", {
      withTimezone: true,
      mode: "date",
    }),
    contentType: varchar("content_type").default("interview-question"),
    documentSource: varchar("document_source").default("generated"),
    content: text("content"),
    parsedContent: jsonb("parsed_content"),
    messageId: varchar("message_id"),
    mediaId: varchar("media_id"),
    metadata: jsonb(),
    tags: jsonb(),
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
    index("interview_questions_application_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("interview_questions_category_idx").using(
      "btree",
      table.category.asc().nullsLast().op("text_ops"),
    ),
    index("interview_questions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "interview_questions_job_id_job_posts_id_fk",
    }).onDelete("set null"),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().notNull(),
    email: varchar({ length: 320 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    passwordHash: text("password_hash"),
    accountStatus: accountStatus("account_status")
      .default("pending_verification")
      .notNull(),
    role: userRole().default("user").notNull(),
    authProvider: varchar("auth_provider", { length: 50 }),
    accountTier: varchar("account_tier", { length: 20 })
      .default("basic")
      .notNull(),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("users_account_status_idx").using(
      "btree",
      table.accountStatus.asc().nullsLast().op("enum_ops"),
    ),
    index("users_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    uniqueIndex("users_email_idx").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
    unique("users_email_unique").on(table.email),
  ],
);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    displayName: varchar("display_name", { length: 200 }),
    photoUrl: text("photo_url"),
    bio: text(),
    defaultResumeId: uuid("default_resume_id"),
    timezone: varchar({ length: 50 }).default("UTC"),
    locale: varchar({ length: 10 }).default("en-US"),
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
    index("user_profiles_display_name_idx").using(
      "btree",
      table.displayName.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const userContacts = pgTable(
  "user_contacts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    phoneNumber: varchar("phone_number"),
    phoneVerified: boolean("phone_verified").default(false).notNull(),
    countryCode: varchar("country_code"),
    country: varchar("country"),
    // Raw geo metadata from IP providers (capital, currency, phone_code, etc.)
    // Populated when the provider returns a structured country object (e.g. ipwho.is).
    countryMetadata: jsonb("country_metadata"),
    state: varchar("state"),
    city: varchar("city"),
    address: text("address"),
    postalCode: varchar("postal_code"),
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
    index("user_contacts_country_code_idx").using(
      "btree",
      table.countryCode.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const userCredits = pgTable("user_credits", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  creditBalance: integer("credit_balance").default(0).notNull(),
  lastTransactionAt: timestamp("last_transaction_at", {
    withTimezone: true,
    mode: "date",
  }),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const userReferrals = pgTable(
  "user_referrals",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    referralCode: varchar("referral_code", { length: 20 }).notNull(),
    referredBy: uuid("referred_by"),
    referralCount: integer("referral_count").default(0).notNull(),
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
    uniqueIndex("user_referrals_code_idx").using(
      "btree",
      table.referralCode.asc().nullsLast().op("text_ops"),
    ),
    index("user_referrals_referred_by_idx").using(
      "btree",
      table.referredBy.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.referredBy],
      foreignColumns: [users.id],
      name: "user_referrals_referred_by_users_id_fk",
    }),
    unique("user_referrals_referral_code_unique").on(table.referralCode),
  ],
);

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),

    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("referral_codes_code_unique").on(table.code),
    index("referral_codes_owner_idx").on(table.ownerUserId),
  ],
);

/**
 * Immutable audit log of milestone-based credit rewards earned through the
 * referral programme. A row is inserted — never updated — each time a referrer
 * crosses a REFERRAL_MILESTONE_THRESHOLD boundary.
 *
 * The UNIQUE constraint on referree_user_id enforces exactly-once reward
 * semantics: a single referral event can trigger at most one reward entry even
 * under concurrent or retried requests.
 */
export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    /** The user who made the referral and receives the credit award. */
    referrerUserId: uuid("referrer_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** The newly-referred user whose sign-up crossed the milestone. */
    referreeUserId: uuid("referree_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** Credits added to the referrer's balance at the time of this reward. */
    creditsAwarded: integer("credits_awarded").notNull(),
    /** Snapshot of the referrer's referral_count when the reward fired. */
    referralCountAtAward: integer("referral_count_at_award").notNull(),
    /** Ordinal milestone number (1 = first 5 referrals, 2 = next 5, …). */
    milestoneNumber: integer("milestone_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("referral_rewards_referrer_idx").on(table.referrerUserId),
    index("referral_rewards_milestone_idx").on(
      table.referrerUserId,
      table.milestoneNumber,
    ),
    uniqueIndex("referral_rewards_referree_unique_idx").on(
      table.referreeUserId,
    ),
  ],
);


export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    isProUser: boolean("is_pro_user").default(false).notNull(),
    subscriptionTier: varchar("subscription_tier", { length: 50 }),
    subscriptionStatus: varchar("subscription_status", { length: 50 }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
      mode: "date",
    }),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
      mode: "date",
    }),
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
    index("user_subscriptions_is_pro_idx").using(
      "btree",
      table.isProUser.asc().nullsLast().op("bool_ops"),
    ),
    uniqueIndex("user_subscriptions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
  ],
);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    slug: varchar({ length: 100 }).notNull(),
    description: text(),
    planType: subscriptionPlan("plan_type").notNull(),
    price: integer().notNull(),
    currency: currency().default("USD").notNull(),
    billingInterval: billingInterval("billing_interval").notNull(),
    intervalCount: integer("interval_count").default(1).notNull(),
    trialPeriodDays: integer("trial_period_days").default(0),
    features: jsonb(),
    stripeProductId: varchar("stripe_product_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    displayOrder: integer("display_order").default(0),
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
    index("subscription_plans_is_active_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    index("subscription_plans_plan_type_idx").using(
      "btree",
      table.planType.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("subscription_plans_slug_idx").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    unique("subscription_plans_slug_unique").on(table.slug),
    unique("subscription_plans_stripe_price_id_unique").on(table.stripePriceId),
    unique("subscription_plans_stripe_product_id_unique").on(
      table.stripeProductId,
    ),
  ],
);

export const userOnboardings = pgTable(
  "user_onboardings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
    onboardingStep: integer("onboarding_step").default(0),
    userNeeds: jsonb("user_needs"),
    discoverySource: jsonb("discovery_source"),
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
    index("user_onboardings_complete_idx").using(
      "btree",
      table.onboardingComplete.asc().nullsLast().op("bool_ops"),
    ),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  theme: varchar({ length: 20 }).default("system"),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  whatsappNotifications: boolean("whatsapp_notifications").default(false),
  profileVisibility: varchar("profile_visibility", { length: 20 }).default(
    "public",
  ),
  preferredLocations: jsonb("preferred_locations"),
  preferredJobFunctions: jsonb("preferred_job_functions"),
  minSalary: integer("min_salary"),
  maxSalary: integer("max_salary"),
  currency: currency().default("USD"),
  implicitPreferences: jsonb("implicit_preferences"),
  notificationFrequency: varchar("notification_frequency", {
    length: 50,
  }).default("daily"),
  maxRecommendationsPerDay: integer("max_recommendations_per_day").default(5),
  isActive: boolean("is_active").default(true).notNull(),
  pausedUntil: timestamp("paused_until", {
    withTimezone: true,
    mode: "date",
  }),
  showEmail: boolean("show_email").default(false),
  showPhone: boolean("show_phone").default(false),
  employmentTypePreference: jsonb("employment_type_preference"),
  jobPreferences: jsonb("job_preferences"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
});

export const userDiscoverySources = pgTable(
  "user_discovery_sources",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    sourceType: discoverySourceTypeEnum("source_type").notNull(),
    otherSourceDetails: text("other_source_details"),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_discovery_sources_type_idx").using(
      "btree",
      table.sourceType.asc(),
    ),
  ],
);

export const userEmploymentTypePreferences = pgTable(
  "user_employment_type_preferences",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    employmentType: varchar("employment_type"),
    priority: integer().default(1).notNull(), // Higher = more preferred
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_employment_prefs_user_id_idx").using(
      "btree",
      table.userId.asc(),
    ),
    index("user_employment_prefs_type_idx").using(
      "btree",
      table.employmentType.asc(),
    ),
    uniqueIndex("user_employment_prefs_unique_idx").using(
      "btree",
      table.userId.asc(),
      table.employmentType.asc(),
    ),
  ],
);

export const userWorkLocationPreferences = pgTable(
  "user_work_location_preferences",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    workLocation: varchar("work_location"),
    priority: integer().default(1).notNull(), // Higher = more preferred
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // Composite index for efficient user-specific queries
    index("user_work_location_prefs_user_id_idx").using(
      "btree",
      table.userId.asc(),
    ),
    // Index for filtering/grouping by work location type
    index("user_work_location_prefs_location_idx").using(
      "btree",
      table.workLocation.asc(),
    ),
    // Index optimized for priority-based sorting queries
    index("user_work_location_prefs_priority_idx").using(
      "btree",
      table.userId.asc(),
      table.priority.desc(),
    ),
    // Ensure each user can only have one preference entry per work location type
    uniqueIndex("user_work_location_prefs_unique_idx").using(
      "btree",
      table.userId.asc(),
      table.workLocation.asc(),
    ),
  ],
);

export const userIssues = pgTable(
  "user_issues",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    issueType: userIssueTypeEnum("issue_type").notNull(),
    otherIssueDetails: text("other_issue_details"),
    severity: integer().default(3), // 1-5 scale
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("user_issues_user_id_idx").using("btree", table.userId.asc()),
    index("user_issues_type_idx").using("btree", table.issueType.asc()),
    index("user_issues_severity_idx").using("btree", table.severity.desc()),
    uniqueIndex("user_issues_user_type_unique_idx").using(
      "btree",
      table.userId.asc(),
      table.issueType.asc(),
    ),
  ],
);

export const workExperiences = pgTable(
  "work_experiences",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    resumeId: uuid("resume_id").notNull(),
    position: text(),
    jobTitle: varchar("job_title", { length: 200 }),
    companyName: varchar("company_name", { length: 255 }),
    employmentType: varchar("employment_type"),
    startDate: timestamp("start_date", {
      withTimezone: true,
      mode: "date",
    }),
    endDate: timestamp("end_date", { withTimezone: true, mode: "date" }),
    isCurrent: boolean("is_current").default(false).notNull(),
    location: varchar({ length: 255 }),
    description: text(),
    responsibilities: jsonb(),
    achievements: jsonb(),
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
    index("work_experience_company_name_idx").using(
      "btree",
      table.companyName.asc().nullsLast().op("text_ops"),
    ),
    index("work_experience_data_source_id_idx").using(
      "btree",
      table.resumeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("work_experience_is_current_idx").using(
      "btree",
      table.isCurrent.asc().nullsLast().op("bool_ops"),
    ),
    index("work_experience_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "work_experiences_resume_id_resumes_id_fk",
    }).onDelete("cascade"),
  ],
);

export const educations = pgTable(
  "educations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    resumeId: uuid("resume_id").notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    degree: text(),
    location: text(),
    schoolName: varchar("school_name", { length: 255 }),
    degreeType: varchar("degree_type"),
    fieldOfStudy: varchar("field_of_study", { length: 200 }),
    startDate: timestamp("start_date", { withTimezone: true, mode: "date" }),
    endDate: timestamp("end_date", { withTimezone: true, mode: "date" }),
    academicAchievements: jsonb(),
    isCurrent: boolean("is_current").default(false).notNull(),
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
    index("educations_data_source_id_idx").using(
      "btree",
      table.resumeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("educations_degree_idx").using(
      "btree",
      table.degree.asc().nullsLast().op("text_ops"),
    ),
    index("educations_is_current_idx").using(
      "btree",
      table.isCurrent.asc().nullsLast().op("bool_ops"),
    ),
    index("educations_school_name_idx").using(
      "btree",
      table.schoolName.asc().nullsLast().op("text_ops"),
    ),
    index("educations_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "educations_resume_id_resumes_id_fk",
    }).onDelete("cascade"),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    resumeId: uuid("resume_id").notNull(),
    name: text(),
    description: text(),
    url: text(),
    githubUrl: text("github_url"),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    startDate: timestamp("start_date", { withTimezone: true, mode: "date" }),
    endDate: timestamp("end_date", { withTimezone: true, mode: "date" }),
    isCurrent: boolean("is_current").default(false).notNull(),
    responsibilities: jsonb().default([]),
    techStack: jsonb("tech_stack").default([]),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("projects_data_source_id_idx").using(
      "btree",
      table.resumeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("projects_end_date_idx").using(
      "btree",
      table.endDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("projects_start_date_idx").using(
      "btree",
      table.startDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("projects_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "projects_resume_id_resumes_id_fk",
    }).onDelete("cascade"),
  ],
);

export const certifications = pgTable(
  "certifications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    resumeId: uuid("resume_id").notNull(),
    name: text(),
    expirationDate: timestamp("expiration_date", { mode: "date" }),
    title: varchar({ length: 255 }),
    issuer: varchar({ length: 255 }),
    description: text(),
    issueDate: timestamp("issue_date", { withTimezone: true, mode: "date" }),
    expiryDate: timestamp("expiry_date", {
      withTimezone: true,
      mode: "date",
    }),
    doesNotExpire: boolean("does_not_expire").default(false),
    credentialId: varchar("credential_id", { length: 255 }),
    credentialUrl: text("credential_url"),
    displayOrder: integer("display_order").default(0),
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
    index("certifications_data_source_id_idx").using(
      "btree",
      table.resumeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("certifications_issuer_idx").using(
      "btree",
      table.issuer.asc().nullsLast().op("text_ops"),
    ),
    index("certifications_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "certifications_resume_id_resumes_id_fk",
    }).onDelete("cascade"),
  ],
);

export const userSkills = pgTable(
  "user_skills",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    skillId: uuid("skill_id").notNull(),
    resumeId: uuid("resume_id"),
    isPrimary: boolean("is_primary").default(false),
    skillType: varchar("skill_type", { length: 100 }),
    source: varchar("source", { length: 50 }),
    proficiencyLevel: integer("proficiency_level").default(3),
    yearsOfExperience: real("years_of_experience"),
    isSoftSkill: boolean("is_soft_skill").default(false).notNull(),
    isHardSkill: boolean("is_hard_skill").default(true).notNull(),
    lastUsed: timestamp("last_used", { withTimezone: true, mode: "date" }),
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
    index("user_skills_skill_id_idx").using(
      "btree",
      table.skillId.asc().nullsLast().op("uuid_ops"),
    ),
    uniqueIndex("user_skills_unique_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      // table.resumeId.asc().nullsLast().op("uuid_ops"),
      table.skillId.asc().nullsLast().op("uuid_ops"),
    ),
    index("user_skills_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.resumeId],
      foreignColumns: [resumes.id],
      name: "user_skills_resume_id_resumes_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.skillId],
      foreignColumns: [skills.id],
      name: "user_skills_skill_id_skills_id_fk",
    }).onDelete("cascade"),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    proficiencyLevel: integer("proficiency_level"),
    name: varchar().notNull(),
    slug: varchar().notNull(),
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
    index("skills_name_idx").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("skills_slug_idx").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    unique("skills_name_unique").on(table.name),
    unique("skills_slug_unique").on(table.slug),
  ],
);

export const resumes = pgTable(
  "resumes",
  {
    // Resume ID will be provided externally to align with firebase
    id: uuid().primaryKey().notNull(),
    // id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text(),
    type: varchar({ length: 255 }).default("generated"),
    documentSource: varchar("document_source").default("generated"),
    isActive: boolean("is_active").default(true),
    fullName: text("full_name"),
    email: text(),
    phoneNumber: text("phone_number"),
    location: text(),
    linkedIn: text("linked_in"),
    github: text(),
    website: text(),
    summary: text(),
    description: text(),
    jobLevel: varchar("job_level").default("mid-level"),
    jobType: varchar("job_type").default("full-time"),
    remotePreference: boolean("remote_preference").default(true),
    relocationWillingness: boolean("relocation_willing_ness").default(true),
    salary: varchar("salary").notNull().default("negotiable"),
    availabilityToStart: varchar("availability_to_start").default(
      "immediately",
    ),
    s3Path: text("s3_path"),
    fileName: varchar("file_name", { length: 255 }),
    originalName: varchar("original_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    fileSize: integer("file_size"),
    gcsPath: text("gcs_path"),
    fileUrl: text("file_url"),
    rawResumeText: text("raw_resume_text"),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    jobId: uuid("job_id"),
    contentType: varchar("content_type").default("resume"),
    messageId: varchar("message_id"),
    mediaId: varchar("media_id"),
    metadata: jsonb(),
  },
  (table) => [
    index("resumes_is_default_idx").using(
      "btree",
      table.isDefault.asc().nullsLast().op("bool_ops"),
    ),
    index("resumes_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "resumes_job_id_job_posts_id_fk",
    }),
  ],
);

export const autoApply = pgTable(
  "auto_apply",
  {
    id: uuid("id").primaryKey().notNull(),
    // id: uuid("id").defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    resumeId: uuid("resume_id").references(() => resumes.id, {
      onDelete: "set null",
    }),
    jobId: uuid("job_id").references(() => jobPosts.id, {
      onDelete: "set null",
    }),

    coverLetterId: uuid("cover_letter_id").references(() => coverLetters.id, {
      onDelete: "set null",
    }),

    title: varchar("title", { length: 255 }).notNull(),

    type: varchar("type", { length: 50 }).default("email").notNull(), // email | pdf | doc

    fileType: varchar("file_type", { length: 20 }), // pdf, docx

    email: varchar("email"),
    recruiterEmail: varchar("recruiter_email"),

    jobDescription: text("job_description"),

    status: varchar("status", { length: 30 }).default("generated"),
    sentAt: timestamp("sent_at", {
      withTimezone: true,
      mode: "date",
    }),

    errorReason: text("error_reason"),

    source: varchar("source", { length: 30 }).default("auto_apply"),

    gcsPath: text("gcs_path"),
    pdfSignedUrl: text("pdf_signed_url"),

    modifiedBy: uuid("modified_by").references(() => users.id, {
      onDelete: "set null",
    }),

    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),

    metadata: jsonb("metadata"),
  },
  (table) => [
    index("auto_apply_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("auto_apply_user_status_idx").using(
      "btree",
      table.userId,
      table.status,
    ),

    index("auto_apply_job_id_idx").using("btree", table.jobId),

    index("auto_apply_resume_id_idx").using(
      "btree",
      table.resumeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("auto_apply_cover_letter_id_idx").using(
      "btree",
      table.coverLetterId.asc().nullsLast().op("uuid_ops"),
    ),
    index("auto_apply_generated_at_idx").using(
      "btree",
      table.generatedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
  ],
);

export const aiApplySettings = pgTable(
  "ai_apply_settings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    autoApplyEnabled: boolean("auto_apply_enabled").default(false).notNull(),
    autoSendApplications: boolean("auto_send_applications")
      .default(false)
      .notNull(),
    enableWhatsAppApplications: boolean("enable_whatsapp_applications").default(
      false,
    ),
    saveAsDrafts: boolean("save_as_drafts").default(true).notNull(),
    generateTailoredCv: boolean("generate_tailored_cv").default(true).notNull(),
    useMasterCv: boolean("use_master_cv").default(false).notNull(),
    masterCvId: uuid("master_cv_id"),
    minMatchScore: real("min_match_score").default(70),
    maxApplicationsPerDay: integer("max_applications_per_day").default(10),
    maxApplicationsPerWeek: integer("max_applications_per_week").default(50),
    preferredJobTypes: jsonb("preferred_job_types"),
    preferredWorkLocations: jsonb("preferred_work_locations"),
    excludedCompanies: jsonb("excluded_companies"),
    preferredLocations: jsonb("preferred_locations"),
    minSalary: integer("min_salary"),
    maxSalary: integer("max_salary"),
    salaryCurrency: currency("salary_currency").default("USD"),
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
    index("ai_apply_settings_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.masterCvId],
      foreignColumns: [resumes.id],
      name: "ai_apply_settings_master_cv_id_resumes_id_fk",
    }).onDelete("set null"),
    unique("ai_apply_settings_user_id_unique").on(table.userId),
  ],
);

export const coverLetters = pgTable(
  "cover_letters",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    applicationId: uuid("application_id"),
    jobId: uuid("job_id"),
    title: varchar("title"),
    content: text("content").notNull(),
    address: text("address"),
    recruiterEmail: varchar("recruiter_email"),
    phoneNumber: varchar("phone_number"),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    aiGenerated: boolean("ai_generated").default(false).notNull(),
    aiModel: varchar("ai_model", { length: 100 }),
    generationPrompt: text("generation_prompt"),
    templateId: uuid("template_id"),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
    contentType: varchar("content_type").default("cover-letter"),
    documentSource: varchar("document_source").default("generated"),
    messageId: varchar("message_id"),
    metadata: jsonb(),
  },
  (table) => [
    index("cover_letters_application_id_idx").using(
      "btree",
      table.applicationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cover_letters_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("cover_letters_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "cover_letters_job_id_job_posts_id_fk",
    }).onDelete("set null"),
  ],
);

export const countries = pgTable(
  "countries",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar({ length: 3 }).notNull(),
    code2: varchar("code_2", { length: 2 }).notNull(),
    name: varchar({ length: 100 }).notNull(),
    nativeName: varchar("native_name", { length: 100 }),
    capital: varchar({ length: 100 }),
    region: varchar({ length: 100 }),
    subregion: varchar({ length: 100 }),
    latitude: real(),
    longitude: real(),
    phoneCode: varchar("phone_code", { length: 10 }),
    currency: varchar({ length: 3 }),
    currencyName: varchar("currency_name", { length: 100 }),
    currencySymbol: varchar("currency_symbol", { length: 10 }),
    flagEmoji: varchar("flag_emoji", { length: 10 }),
    flagUrl: text("flag_url"),
    isActive: boolean("is_active").default(true).notNull(),
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
    index("countries_name_idx").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
  ],
);

// ─── Chat Sessions Table ───────────────────────────────────────────────────────
// One row per contact (the chat-list pane in the UI)

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    // Contact identity
    phoneNumber: text("phone_number"),
    contactName: varchar("contact_name", { length: 255 }),
    contactAvatarUrl: text("contact_avatar_url"),
    isOnline: boolean("is_online").default(false),
    // Chat-list preview
    lastMessage: text("last_message"),
    lastMessageTime: timestamp("last_message_time", {
      withTimezone: true,
      mode: "date",
    }),
    isAiLastMessage: boolean("is_ai_last_message").default(false),
    unreadCount: integer("unread_count").default(0),
    // Per-contact aggregate counters (visible as badges in the UI)
    autoApplyCount: integer("auto_apply_count").default(0),
    documentsGeneratedCount: integer("documents_generated_count").default(0),
    appliedCount: integer("applied_count").default(0),
    totalMessagesCount: integer("total_messages_count").default(0),
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
    index("chat_sessions_user_id_idx").on(table.userId),
    index("chat_sessions_phone_number_idx").on(table.phoneNumber),
    index("chat_sessions_user_phone_idx").on(table.userId, table.phoneNumber),
    index("chat_sessions_updated_at_idx").on(table.updatedAt),
    index("chat_sessions_unread_count_idx").on(table.unreadCount),
  ],
);

// ─── Chat History Table ────────────────────────────────────────────────────────
// One row per message (the conversation thread in the UI)

export const chatHistory = pgTable(
  "chat_history",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sessionId: uuid("session_id").references(() => chatSessions.id, {
      onDelete: "cascade",
    }),
    phoneNumber: text("phone_number"),
    // Message content
    role: text(), // "user" | "ai" | "system"
    message: text(),
    messageType: text("message_type").default("text"), // "text" | "file" | "image"
    // Message direction & status
    isOutgoing: boolean("is_outgoing").default(false),
    isRead: boolean("is_read").default(false),
    isDelivered: boolean("is_delivered").default(false),
    isAiGenerated: boolean("is_ai_generated").default(false),
    // File attachment fields (populated when messageType = "file")
    fileName: varchar("file_name", { length: 255 }),
    filePages: integer("file_pages"),
    fileSize: varchar("file_size", { length: 50 }),
    fileExtension: varchar("file_extension", { length: 10 }),
    fileUrl: text("file_url"),
    // External reference
    whatsappMessageId: varchar("whatsapp_message_id", { length: 100 }),
    // Set when the message was sent manually by an admin (not AI-generated)
    sentByAdminId: uuid("sent_by_admin_id").references(() => users.id),
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
    index("chat_history_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("chat_history_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    index("chat_history_session_id_idx").on(table.sessionId),
    index("chat_history_phone_number_idx").on(table.phoneNumber),
    index("chat_history_is_outgoing_idx").on(table.isOutgoing),
    index("chat_history_is_read_idx").on(table.isRead),
  ],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: integer().notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    type: varchar({ length: 50 }).notNull(),
    reason: text(),
    referenceId: uuid("reference_id"),
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
    index("credit_transactions_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("credit_transactions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
  ],
);

export const authProviders = pgTable(
  "auth_providers",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: authProvider().notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    tokenType: varchar("token_type", { length: 50 }),
    scope: text(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    providerData: jsonb("provider_data"),
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
    index("auth_providers_provider_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("auth_providers_unique_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("text_ops"),
      table.providerAccountId.asc().nullsLast().op("text_ops"),
    ),
    index("auth_providers_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
  ],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    action: varchar({ length: 100 }).notNull(),
    entity: varchar({ length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    description: text(),
    changes: jsonb(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
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
    index("activity_log_action_idx").using(
      "btree",
      table.action.asc().nullsLast().op("text_ops"),
    ),
    index("activity_log_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("activity_log_entity_id_idx").using(
      "btree",
      table.entityId.asc().nullsLast().op("uuid_ops"),
    ),
    index("activity_log_entity_idx").using(
      "btree",
      table.entity.asc().nullsLast().op("text_ops"),
    ),
    index("activity_log_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
  ],
);

export const processingQueue = pgTable(
  "processing_queue",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    phoneNumber: text("phone_number").notNull(),
    operationType: text("operation_type").notNull(),
    jobId: uuid("job_id"),
    status: text().default("queued"),
    progress: text(),
    result: jsonb(),
    errorMessage: text("error_message"),
    queuedAt: timestamp("queued_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "date",
    }),
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
    index("processing_queue_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("processing_queue_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const recommendationFeedback = pgTable(
  "recommendation_feedback",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    recommendationId: uuid("recommendation_id").notNull(),
    feedbackType: varchar("feedback_type", { length: 50 }).notNull(),
    feedbackReason: text("feedback_reason"),
    feedbackRating: integer("feedback_rating"),
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
    index("recommendation_feedback_recommendation_id_idx").using(
      "btree",
      table.recommendationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("recommendation_feedback_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("recommendation_feedback_user_recommendation_unique_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.recommendationId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.recommendationId],
      foreignColumns: [jobRecommendations.id],
      name: "recommendation_feedback_recommendation_id_job_recommendations_i",
    }).onDelete("cascade"),
  ],
);

export const newJobsQueue = pgTable(
  "new_jobs_queue",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    jobId: uuid("job_id").notNull(),
    status: varchar({ length: 50 }).default("pending").notNull(),
    priority: integer().default(0).notNull(),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "date",
    }),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("new_jobs_queue_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("new_jobs_queue_status_priority_idx").using(
      "btree",
      table.status.asc().nullsLast().op("int4_ops"),
      table.priority.asc().nullsLast().op("int4_ops"),
      table.createdAt.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "new_jobs_queue_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ],
);

export const jobClicks = pgTable(
  "job_clicks",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id").notNull(),
    recommendationId: uuid("recommendation_id"),
    clickType: varchar("click_type", { length: 50 }).notNull(),
    clickedAt: timestamp("clicked_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
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
    index("job_clicks_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_clicks_recommendation_id_idx").using(
      "btree",
      table.recommendationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_clicks_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.clickedAt.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_clicks_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.recommendationId],
      foreignColumns: [jobRecommendations.id],
      name: "job_clicks_recommendation_id_job_recommendations_id_fk",
    }),
  ],
);

export const jobPerformanceMetrics = pgTable(
  "job_performance_metrics",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    jobId: uuid("job_id").notNull(),
    totalRecommendations: integer("total_recommendations").default(0).notNull(),
    totalViews: integer("total_views").default(0).notNull(),
    totalClicks: integer("total_clicks").default(0).notNull(),
    totalApplications: integer("total_applications").default(0).notNull(),
    viewRate: real("view_rate").default(0),
    clickThroughRate: real("click_through_rate").default(0),
    applicationRate: real("application_rate").default(0),
    conversionRate: real("conversion_rate").default(0),
    avgMatchScore: real("avg_match_score"),
    avgViewDuration: real("avg_view_duration"),
    positiveFeedbackCount: integer("positive_feedback_count").default(0),
    negativeFeedbackCount: integer("negative_feedback_count").default(0),
    calculatedAt: timestamp("calculated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    windowEnd: timestamp("window_end", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
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
    index("job_performance_metrics_calculated_at_idx").using(
      "btree",
      table.calculatedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("job_performance_metrics_conversion_rate_idx").using(
      "btree",
      table.conversionRate.asc().nullsLast().op("float4_ops"),
    ),
    index("job_performance_metrics_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("timestamptz_ops"),
      table.calculatedAt.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_performance_metrics_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ],
);

export const jobRecommendations = pgTable(
  "job_recommendations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id").notNull(),
    recommendationDate: timestamp("recommendation_date", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    status: varchar({ length: 50 }).default("draft").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "date" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true, mode: "date" }),
    matchScore: real("match_score").notNull(),
    confidenceScore: real("confidence_score"),
    geminiReasoning: text("gemini_reasoning"),
    matchingFeatures: jsonb("matching_features"),
    errorMessage: text("error_message"),
    experimentId: uuid("experiment_id"),
    modelVersion: varchar("model_version", { length: 50 }),
    rankPosition: doublePrecision("rank_position"),
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
    index("job_recommendations_date_idx").using(
      "btree",
      table.recommendationDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("job_recommendations_experiment_idx").using(
      "btree",
      table.experimentId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_recommendations_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_recommendations_match_score_idx").using(
      "btree",
      table.matchScore.asc().nullsLast().op("float4_ops"),
    ),
    index("job_recommendations_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("job_recommendations_user_date_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.recommendationDate.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("job_recommendations_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.recommendationDate.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("job_recommendations_user_job_unique_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.jobId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_recommendations_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
  ],
);

export const jobViews = pgTable(
  "job_views",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    jobId: uuid("job_id").notNull(),
    recommendationId: uuid("recommendation_id"),
    viewSource: varchar("view_source", { length: 50 }).notNull(),
    sessionId: text("session_id"),
    deviceType: varchar("device_type", { length: 50 }),
    viewDurationSeconds: integer("view_duration_seconds"),
    scrollDepthPercent: integer("scroll_depth_percent"),
    viewedAt: timestamp("viewed_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
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
    index("job_views_job_id_idx").using(
      "btree",
      table.jobId.asc().nullsLast().op("timestamptz_ops"),
      table.viewedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("job_views_recommendation_id_idx").using(
      "btree",
      table.recommendationId.asc().nullsLast().op("uuid_ops"),
    ),
    index("job_views_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.viewedAt.asc().nullsLast().op("text_ops"),
    ),
    index("job_views_viewed_at_idx").using(
      "btree",
      table.viewedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobPosts.id],
      name: "job_views_job_id_job_posts_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.recommendationId],
      foreignColumns: [jobRecommendations.id],
      name: "job_views_recommendation_id_job_recommendations_id_fk",
    }),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    slug: varchar({ length: 200 }).notNull(),
    description: text(),
    category: varchar({ length: 100 }),
    level: varchar({ length: 50 }),
    isActive: boolean("is_active").default(true).notNull(),
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
    index("roles_name_idx").using(
      "btree",
      table.name.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("roles_slug_idx").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops"),
    ),
    unique("roles_name_unique").on(table.name),
    unique("roles_slug_unique").on(table.slug),
  ],
);

export const userEngagementMetrics = pgTable(
  "user_engagement_metrics",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    totalRecommendationsReceived: integer("total_recommendations_received")
      .default(0)
      .notNull(),
    totalJobsViewed: integer("total_jobs_viewed").default(0).notNull(),
    totalJobsApplied: integer("total_jobs_applied").default(0).notNull(),
    totalSearches: integer("total_searches").default(0).notNull(),
    recommendationOpenRate: real("recommendation_open_rate").default(0),
    averageSessionDuration: real("average_session_duration"),
    lastActivityAt: timestamp("last_activity_at", {
      withTimezone: true,
      mode: "date",
    }),
    isEngaged: boolean("is_engaged").default(true).notNull(),
    riskOfChurn: real("risk_of_churn"),
    calculatedAt: timestamp("calculated_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
    windowStart: timestamp("window_start", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    windowEnd: timestamp("window_end", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
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
    index("user_engagement_metrics_is_engaged_idx").using(
      "btree",
      table.isEngaged.asc().nullsLast().op("bool_ops"),
    ),
    index("user_engagement_metrics_risk_of_churn_idx").using(
      "btree",
      table.riskOfChurn.asc().nullsLast().op("float4_ops"),
    ),
    index("user_engagement_metrics_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
      table.calculatedAt.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    phoneNumber: text("phone_number").notNull(),
    whatsappId: text("whatsapp_id"),
    extractedJobData: jsonb("extracted_job_data"),
    sessionState: text("session_state").default("idle"),
    lastInteraction: timestamp("last_interaction", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    context: jsonb(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
    loginCount: integer("login_count").default(0).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceId: varchar("device_id", { length: 100 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("user_sessions_last_login_idx").using(
      "btree",
      table.lastLoginAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("user_sessions_phone_number_idx").using(
      "btree",
      table.phoneNumber.asc().nullsLast().op("text_ops"),
    ),
    index("user_sessions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("text_ops"),
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar({ length: 100 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    actionUrl: text("action_url"),
    actionLabel: varchar("action_label", { length: 100 }),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
    priority: varchar({ length: 20 }).default("normal"),
    metadata: jsonb(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
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
    index("notifications_created_at_idx").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("notifications_is_read_idx").using(
      "btree",
      table.isRead.asc().nullsLast().op("bool_ops"),
    ),
    index("notifications_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    index("notifications_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("notifications_user_unread_idx")
      .using(
        "btree",
        table.userId.asc().nullsLast().op("bool_ops"),
        table.isRead.asc().nullsLast().op("bool_ops"),
      )
      .where(sql`(is_read = false)`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    sessionId: uuid("session_id"), // TODO: consider making this a non-nullable unique identifier and index it
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceId: varchar("device_id", { length: 255 }),
    deviceName: varchar("device_name", { length: 100 }),
    deviceType: varchar("device_type", { length: 50 }),
    browser: varchar({ length: 100 }),
    os: varchar({ length: 100 }),
    country: varchar({ length: 3 }),
    city: varchar({ length: 100 }),
    region: varchar({ length: 100 }),
    latitude: real(),
    longitude: real(),
    isActive: boolean("is_active").default(true).notNull(),
    lastActivityAt: timestamp("last_activity_at", {
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
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("sessions_expires_at_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("sessions_is_active_idx").using(
      "btree",
      table.isActive.asc().nullsLast().op("bool_ops"),
    ),
    uniqueIndex("sessions_token_idx").using(
      "btree",
      table.sessionToken.asc().nullsLast().op("text_ops"),
    ),
    index("sessions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    unique("sessions_session_token_unique").on(table.sessionToken),
  ],
);

export const userAnalytics = pgTable(
  "user_analytics",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    totalApplications: integer("total_applications").default(0).notNull(),
    totalResumes: integer("total_resumes").default(0).notNull(),
    totalInterviewQuestions: integer("total_interview_questions")
      .default(0)
      .notNull(),
    totalCoverLetters: integer("total_cover_letters").default(0).notNull(),
    lastResumeUpdate: timestamp("last_resume_update", {
      withTimezone: true,
      mode: "date",
    }),
    averageApplicationTime: integer("average_application_time"),
    lastComputedAt: timestamp("last_computed_at", {
      withTimezone: true,
      mode: "date",
    }),
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
    uniqueIndex("user_analytics_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
  ],
);

/**
 * Tracks active user sessions and recent activity across the application
 * Captures real-time user engagement, location, and activity data
 */
export const userActivity = pgTable(
  "user_activity",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    page: varchar("page", { length: 255 }),
    route: varchar("route", { length: 255 }),
    component: varchar("component", { length: 255 }),
    description: text(),
    metadata: jsonb(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    deviceType: varchar("device_type", { length: 50 }),
    browser: varchar({ length: 100 }),
    os: varchar({ length: 100 }),
    country: varchar({ length: 100 }),
    city: varchar({ length: 100 }),
    region: varchar({ length: 100 }),
    latitude: real(),
    longitude: real(),
    durationSeconds: integer("duration_seconds"),
    lastActivityAt: timestamp("last_activity_at", {
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
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    index("user_activity_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("user_activity_session_id_idx").using(
      "btree",
      table.sessionId.asc().nullsLast().op("uuid_ops"),
    ),
    index("user_activity_action_idx").using(
      "btree",
      table.action.asc().nullsLast().op("text_ops"),
    ),
    index("user_activity_page_idx").using(
      "btree",
      table.page.asc().nullsLast().op("text_ops"),
    ),
    index("user_activity_last_activity_at_idx").using(
      "btree",
      table.lastActivityAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("user_activity_created_at_idx").using(
      "btree",
      table.createdAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("user_activity_user_last_activity_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.lastActivityAt.desc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_user_activity_active")
      .using(
        "btree",
        table.userId.asc().nullsLast().op("uuid_ops"),
        table.lastActivityAt.desc().nullsLast().op("timestamptz_ops"),
      )
      .where(sql`deleted_at IS NULL`),
  ],
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email"),
    token: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 50 }).notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, mode: "date" }),
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
    index("verification_tokens_expires_at_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    uniqueIndex("verification_tokens_token_idx").using(
      "btree",
      table.token.asc().nullsLast().op("text_ops"),
    ),
    index("verification_tokens_type_idx").using(
      "btree",
      table.type.asc().nullsLast().op("text_ops"),
    ),
    index("verification_tokens_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    unique("verification_tokens_token_unique").on(table.token),
  ],
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Internal user reference
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // OAuth provider (google, microsoft, etc.)
    provider: text("provider").default("google").notNull(),

    // Email granted by the provider (gmail address)
    providerEmail: text("provider_email").notNull(),

    // OAuth tokens
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),

    // ID token (JWT from Google — optional but valuable)
    idToken: text("id_token"),

    tokenType: text("token_type").default("Bearer"),
    scope: text("scope"),

    // Access token expiry (absolute time)
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),

    // Refresh token expiry (Google usually long-lived but not infinite)
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),

    // Metadata
    createdAt: timestamp("created_at", {
      withTimezone: true,
    }).defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => [
    // One provider account per user (Google → one Gmail)
    uniqueIndex("oauth_accounts_user_provider_unique").on(
      table.userId,
      table.provider,
    ),

    index("oauth_accounts_provider_email_idx").on(table.providerEmail),

    index("oauth_accounts_provider_idx").on(table.provider),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    planId: uuid("plan_id").notNull(),
    status: subscriptionStatus().default("incomplete").notNull(),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
      mode: "date",
    }),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
      mode: "date",
    }),
    trialStart: timestamp("trial_start", {
      withTimezone: true,
      mode: "date",
    }),
    trialEnd: timestamp("trial_end", { withTimezone: true, mode: "date" }),
    cancelAt: timestamp("cancel_at", { withTimezone: true, mode: "date" }),
    canceledAt: timestamp("canceled_at", {
      withTimezone: true,
      mode: "date",
    }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    cancellationReason: text("cancellation_reason"),
    endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
    renewedAt: timestamp("renewed_at", { withTimezone: true, mode: "date" }),
    renewedSubscriptionId: uuid("renewed_subscription_id"),
    quantity: integer().default(1).notNull(),
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
    index("subscriptions_active_idx")
      .using(
        "btree",
        table.userId.asc().nullsLast().op("uuid_ops"),
        table.status.asc().nullsLast().op("enum_ops"),
      )
      .where(
        sql`(status = ANY (ARRAY['active'::subscription_status, 'trialing'::subscription_status]))`,
      ),
    index("subscriptions_current_period_end_idx").using(
      "btree",
      table.currentPeriodEnd.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("subscriptions_plan_id_idx").using(
      "btree",
      table.planId.asc().nullsLast().op("uuid_ops"),
    ),
    index("subscriptions_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    uniqueIndex("subscriptions_stripe_id_idx").using(
      "btree",
      table.stripeSubscriptionId.asc().nullsLast().op("text_ops"),
    ),
    index("subscriptions_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.planId],
      foreignColumns: [subscriptionPlans.id],
      name: "subscriptions_plan_id_subscription_plans_id_fk",
    }),
    unique("subscriptions_stripe_subscription_id_unique").on(
      table.stripeSubscriptionId,
    ),
  ],
);

// ─── Browser Automation Tables ────────────────────────────────────────────────

/**
 * automation_runs — lifecycle record for each Python worker execution.
 * Written by both the Python worker (via asyncpg) and the Node.js side (Drizzle).
 * The Python worker creates the row (status=RUNNING) and updates it on
 * COMPLETED or FAILED. The Node.js side reads it for status checks.
 */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** sha256(userId:automationName:sortedInputData) — unique per logical job */
    idempotencyKey: varchar("idempotency_key", { length: 512 }).notNull(),
    /** e.g. "job_application_submit" */
    automationName: varchar("automation_name", { length: 100 }).notNull(),
    /** Full inputData payload passed to the Python worker */
    inputData: jsonb("input_data"),
    status: varchar({ length: 20 }).notNull().default("RUNNING"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    /** Full result payload returned by the Python worker */
    results: jsonb("results"),
    executionTimeMs: integer("execution_time_ms"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0).notNull(),
    /** OpenTelemetry trace ID for cross-service log correlation */
    traceId: varchar("trace_id", { length: 128 }),
    // ── Pause / human-intervention fields ─────────────────────────────────────
    /** captcha | email_verification | account_required | login_required | unknown */
    pausedReason: varchar("paused_reason", { length: 50 }),
    /** URL the browser was on when the pause was triggered */
    pausedUrl: text("paused_url"),
    pausedAt: timestamp("paused_at", { withTimezone: true, mode: "date" }),
    /** After this timestamp the pause window has expired — re-queue is no longer valid */
    resumeDeadlineAt: timestamp("resume_deadline_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    uniqueIndex("automation_runs_idempotency_key_idx").using(
      "btree",
      table.idempotencyKey.asc().nullsLast().op("text_ops"),
    ),
    index("automation_runs_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    index("automation_runs_status_idx").using(
      "btree",
      table.status.asc().nullsLast().op("text_ops"),
    ),
    index("automation_runs_started_at_idx").using(
      "btree",
      table.startedAt.desc().nullsLast().op("timestamptz_ops"),
    ),
  ],
);

/**
 * outbox — transactional outbox for CDC event delivery.
 * Written atomically with automation_runs updates. A separate CDC process
 * reads rows where published_at IS NULL and delivers them to consumers.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    automationRunId: uuid("automation_run_id"),
    /** e.g. "automation.completed" | "automation.failed" */
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload"),
    /** Null until the CDC process successfully delivers the event */
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("outbox_published_at_idx").using(
      "btree",
      table.publishedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("outbox_automation_run_id_idx").using(
      "btree",
      table.automationRunId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.automationRunId],
      foreignColumns: [automationRuns.id],
      name: "outbox_automation_run_id_fk",
    }).onDelete("cascade"),
  ],
);

/**
 * user_devices — FCM push token registry.
 *
 * One user can have many devices (phone, tablet, web PWA). Each device registers
 * its FCM token on app launch. The push service fans out to all active tokens for
 * a user when an automation pause notification needs to be sent.
 *
 * Tokens are upserted on each app launch (UNIQUE on fcm_token). A stale token
 * (unregistered by FCM) is silently dropped when FCM returns UNREGISTERED.
 */
export const userDevices = pgTable(
  "user_devices",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    /** FCM registration token — rotate on each app launch */
    fcmToken: text("fcm_token").notNull(),
    /** ios | android | web */
    platform: varchar("platform", { length: 10 }).notNull().default("android"),
    /** Optional human-readable label ("Gabriel's iPhone 15") */
    deviceName: varchar("device_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("user_devices_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    // One token can only belong to one device record (prevents duplicates on re-register)
    uniqueIndex("user_devices_fcm_token_idx").using(
      "btree",
      table.fcmToken.asc().nullsLast().op("text_ops"),
    ),
  ],
);

/**
 * idempotency_cache — 48-hour result cache keyed by idempotency_key.
 * The Python worker checks this before running any browser automation.
 * Written by the Python worker via asyncpg after a successful run.
 */
export const idempotencyCache = pgTable(
  "idempotency_cache",
  {
    idempotencyKey: varchar("idempotency_key", { length: 512 }).primaryKey().notNull(),
    /** Full AutomationJobResult payload */
    result: jsonb("result").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull()
      .$defaultFn(() => new Date(Date.now() + 48 * 60 * 60 * 1000)),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idempotency_cache_expires_at_idx").using(
      "btree",
      table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
    ),
  ],
);
