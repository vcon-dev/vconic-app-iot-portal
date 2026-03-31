import { pgTable, text, uuid, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";

export const vconsTable = pgTable("vcons", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => devicesTable.id, { onDelete: "cascade" }),
  vconUuid: text("vcon_uuid").notNull(),
  vconVersion: text("vcon_version"),
  subject: text("subject"),
  parties: jsonb("parties").notNull().default([]),
  dialog: jsonb("dialog").notNull().default([]),
  analysis: jsonb("analysis").notNull().default([]),
  attachments: jsonb("attachments").notNull().default([]),
  extensions: jsonb("extensions").notNull().default([]),
  rawJson: text("raw_json").notNull(),
  duration: real("duration"),
  partyCount: integer("party_count").notNull().default(0),
  hasAnalysis: text("has_analysis").notNull().default("false"),
  hasAttachments: text("has_attachments").notNull().default("false"),
  repostStatus: text("repost_status").notNull().default("pending"),
  repostAttempts: integer("repost_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVconSchema = createInsertSchema(vconsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVcon = z.infer<typeof insertVconSchema>;
export type Vcon = typeof vconsTable.$inferSelect;
