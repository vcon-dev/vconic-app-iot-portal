import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const otaFilesTable = pgTable("ota_files", {
  key: varchar("key", { length: 64 }).primaryKey(),
  content: text("content").notNull(),
  size: integer("size").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OtaFile = typeof otaFilesTable.$inferSelect;
