import { index, json, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./user.model.js";

export const aiAssistantMessagesTable = pgTable("ai_assistant_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  matches: json("matches").notNull().default([]),
  mode: text("mode"),
  hint: text("hint"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCreatedIndex: index("ai_assistant_messages_user_created_idx").on(table.user_id, table.created_at),
}));
