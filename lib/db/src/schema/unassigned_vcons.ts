import { pgTable, text, uuid, timestamp, integer } from "drizzle-orm/pg-core";

export const unassignedVconsTable = pgTable("unassigned_vcons", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceIdentifier: text("device_identifier").notNull(),
  sourceToken: text("source_token"),
  sourceIp: text("source_ip"),
  vconUuid: text("vcon_uuid"),
  rawJson: text("raw_json").notNull(),
  reason: text("reason").notNull().default("no_match"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UnassignedVcon = typeof unassignedVconsTable.$inferSelect;
