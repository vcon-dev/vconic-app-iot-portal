import { pgTable, text, uuid, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const settingsTable = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  maxVconCount: integer("max_vcon_count").notNull().default(1000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Settings = typeof settingsTable.$inferSelect;
