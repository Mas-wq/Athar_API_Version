import { index, jsonb, pgTable, text, timestamp, uuid, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const aiProcessingJobsTable = pgTable("ai_processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  job_type: text("job_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  dedupe_key: text("dedupe_key").notNull(),
  status: text("status").notNull().default("QUEUED"),
  attempts: integer("attempts").notNull().default(0),
  available_at: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  last_error: text("last_error"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dedupeUnique: uniqueIndex("ai_processing_jobs_dedupe_unique").on(table.dedupe_key),
  queueIndex: index("ai_processing_jobs_queue_idx").on(table.status, table.available_at),
}));
