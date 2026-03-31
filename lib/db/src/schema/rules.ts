import { pgTable, text, uuid, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { devicesTable } from "./devices";

export const rulesTable = pgTable("rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: uuid("device_id").references(() => devicesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  method: text("method").notNull().default("POST"),
  headers: jsonb("headers").notNull().default({}),
  filterCondition: text("filter_condition"),
  enabled: boolean("enabled").notNull().default(true),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRuleSchema = createInsertSchema(rulesTable).omit({ id: true, createdAt: true, updatedAt: true, successCount: true, failureCount: true });
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rulesTable.$inferSelect;
