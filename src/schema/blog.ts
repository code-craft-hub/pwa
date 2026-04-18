import {
  pgTable,
  index,
  uniqueIndex,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  date,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ─── Blogs Table ──────────────────────────────────────────────────────────────

export const blogStatusEnum = pgEnum("blog_status", [
  "publish",
  "draft",
  "archived",
]);

export const blogs = pgTable(
  "blogs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    summary: text("summary"),
    category: text("category"),
    status: blogStatusEnum("status").default("draft").notNull(),
    descriptionHtml: text("description_html"),
    descriptionText: text("description_text"),
    descriptionJson: text("description_json"),
    authorName: text("author_name"),
    authorComment: text("author_comment"),
    authorAvatar: text("author_avatar"),
    blogCover: text("blog_cover"),
    bigThumbnail: text("big_thumbnail"),
    userEmail: text("user_email"),
    related: jsonb("related"),
    tags: jsonb("tags"),
    slug: varchar("slug").unique(),
    fileLocationInStorage: jsonb("file_location_in_storage"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    importedAt: timestamp("imported_at", {
      withTimezone: true,
      mode: "date",
    }).defaultNow(),
  },
  (table) => [
    index("blogs_status_idx").on(table.status),
    index("blogs_category_idx").on(table.category),
    index("blogs_created_at_idx").on(table.createdAt),
    index("blogs_user_id_idx").on(table.userId),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text("name").notNull().unique(),
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
  (table) => [uniqueIndex("blog_categories_name_uidx").on(table.name)],
);

// ─── Blog Views Table ──────────────────────────────────────────────────────────
// Daily aggregated view counts: one row per (blog_id, date).
// On each page view: INSERT ... ON CONFLICT DO UPDATE SET view_count = view_count + 1

export const blogViews = pgTable(
  "blog_views",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    blogId: uuid("blog_id")
      .references(() => blogs.id, { onDelete: "cascade" })
      .notNull(),
    viewedDate: date("viewed_date").notNull(), // DATE only — no time component
    viewCount: integer("view_count").default(1).notNull(),
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
    uniqueIndex("blog_views_blog_id_date_uidx").on(
      table.blogId,
      table.viewedDate,
    ),
    index("blog_views_blog_id_idx").on(table.blogId),
    index("blog_views_viewed_date_idx").on(table.viewedDate),
  ],
);
