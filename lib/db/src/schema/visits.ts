import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  timeSpentSeconds: real("time_spent_seconds").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  noCount: integer("no_count"),
  finalAnswer: text("final_answer"),
  visitedAt: timestamp("visited_at").notNull().defaultNow(),
});

export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true, visitedAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
