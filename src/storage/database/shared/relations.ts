import { relations } from "drizzle-orm/relations";
import { users, gameRecords } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
	gameRecords: many(gameRecords),
}));

export const gameRecordsRelations = relations(gameRecords, ({ one }) => ({
	user: one(users, {
		fields: [gameRecords.userId],
		references: [users.id],
	}),
}));
