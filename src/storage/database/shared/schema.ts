import { pgTable, serial, varchar, text, timestamp, index, unique, pgPolicy, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const scenarios = pgTable("scenarios", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	openingMessage: text("opening_message").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const blogPosts = pgTable("blog_posts", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 200 }).notNull(),
	summary: varchar({ length: 500 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("blog_posts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("blog_posts_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	unique("blog_posts_slug_unique").on(table.slug),
	pgPolicy("blog_posts_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("blog_posts_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("blog_posts_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("blog_posts_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	pgPolicy("users_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("users_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("users_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("users_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const gameRecords = pgTable("game_records", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	scenario: varchar({ length: 200 }).notNull(),
	finalScore: integer("final_score").notNull(),
	result: varchar({ length: 20 }).notNull(),
	playedAt: timestamp("played_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("game_records_user_id_idx").on(table.userId),
	index("game_records_played_at_idx").on(table.playedAt),
]);
