import {
  pgTable,
  uuid,
  pgEnum,
  timestamp,
  text,
  json,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { usersTable } from "./user.model.js";

export const foundItemStatusEnum = pgEnum("found_item_status", [
  "FOUND",
  "CLAIMED",
  "RETURNED",
  "ARCHIVED",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COLLECTED",
]);

export const lostReportStatusEnum = pgEnum("lost_report_status", [
  "OPEN",
  "MATCHED",
  "RESOLVED",
]);

export const foundItemsTable = pgTable("found_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_type: text("item_type").notNull(),
  // Keep the existing database column to preserve local found-item ownership data.
  finder_id: uuid("staff_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "set null" }),
  date_found: timestamp("date_found", { withTimezone: true }).notNull(),
  location_found: text("location_found").notNull(),
  hidden_details: json("hidden_details").notNull(),
  public_details: json("public_details").notNull(),
  image_urls: json("image_urls"),
  status: foundItemStatusEnum("status").notNull().default("FOUND"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  read_at: timestamp("read_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userCreatedIndex: index("notifications_user_created_idx").on(table.user_id, table.created_at),
}));

export const lostReportsTable = pgTable("lost_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  item_type: text("item_type").notNull(),
  report_details: json("report_details").notNull(),
  date_lost: timestamp("date_lost", { withTimezone: true }).notNull(),
  location_lost: text("location_lost").notNull(),
  image_urls: json("image_urls"),
  status: lostReportStatusEnum("status").notNull().default("OPEN"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Each exact report/found-item pair has one shared AI and claim conversation.
export const conversationsTable = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  lost_report_id: uuid("lost_report_id").references(() => lostReportsTable.id, { onDelete: "cascade" }),
  found_item_id: uuid("found_item_id").notNull().references(() => foundItemsTable.id, { onDelete: "cascade" }),
  claimant_id: uuid("claimant_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  finder_id: uuid("finder_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  match_percentage: integer("match_percentage").notNull().default(0),
  status: text("status").notNull().default("SUGGESTED"),
  claimant_last_read_at: timestamp("claimant_last_read_at", { withTimezone: true }).notNull().defaultNow(),
  finder_last_read_at: timestamp("finder_last_read_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  reportFoundUnique: uniqueIndex("conversations_report_found_unique").on(
    table.lost_report_id,
    table.found_item_id,
  ),
}));

export const handoverRequestsTable = pgTable("handover_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  handover_code: text("handover_code").notNull(),
  status: text("status").notNull().default("REQUESTED"),
  meeting_place: text("meeting_place").notNull(),
  meeting_at: timestamp("meeting_at", { withTimezone: true }).notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  claimant_confirmed_at: timestamp("claimant_confirmed_at", { withTimezone: true }),
  finder_confirmed_at: timestamp("finder_confirmed_at", { withTimezone: true }),
  dispute_claimant_confirmed_at: timestamp("dispute_claimant_confirmed_at", { withTimezone: true }),
  dispute_finder_confirmed_at: timestamp("dispute_finder_confirmed_at", { withTimezone: true }),
  objection_until: timestamp("objection_until", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  conversationUnique: uniqueIndex("handover_requests_conversation_unique").on(table.conversation_id),
}));

export const claimsTable = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  found_item_id: uuid("found_item_id").notNull().references(() => foundItemsTable.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "set null" }),
  lost_report_id: uuid("lost_report_id").references(() => lostReportsTable.id, { onDelete: "set null" }),
  conversation_id: uuid("conversation_id").references(() => conversationsTable.id, { onDelete: "set null" }),
  claim_details: json("claim_details").notNull(),
  image_urls: json("image_urls"),
  match_percentage: integer("match_percentage").default(0),
  approved_at: timestamp("approved_at", { withTimezone: true }),
  status: claimStatusEnum("status").notNull().default("PENDING"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const claimQuestionSessionsTable = pgTable("claim_question_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  found_item_id: uuid("found_item_id").notNull().references(() => foundItemsTable.id, { onDelete: "cascade" }),
  lost_report_id: uuid("lost_report_id").notNull().references(() => lostReportsTable.id, { onDelete: "cascade" }),
  questions: json("questions").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used_at: timestamp("used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemMatchesTable = pgTable("item_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  lost_report_id: uuid("lost_report_id").notNull().references(() => lostReportsTable.id, { onDelete: "cascade" }),
  found_item_id: uuid("found_item_id").notNull().references(() => foundItemsTable.id, { onDelete: "cascade" }),
  match_score: integer("match_score").notNull(),
  status: text("status").notNull().default("PENDING"),
  created_at: timestamp("created_at").defaultNow(),
});

export const foundItemsRelations = relations(foundItemsTable, ({ one, many }) => ({
  finder: one(usersTable, { fields: [foundItemsTable.finder_id], references: [usersTable.id] }),
  claims: many(claimsTable),
}));

export const claimsRelations = relations(claimsTable, ({ one }) => ({
  foundItem: one(foundItemsTable, { fields: [claimsTable.found_item_id], references: [foundItemsTable.id] }),
  user: one(usersTable, { fields: [claimsTable.user_id], references: [usersTable.id] }),
}));

export const lostReportsRelations = relations(lostReportsTable, ({ one }) => ({
  user: one(usersTable, { fields: [lostReportsTable.user_id], references: [usersTable.id] }),
}));
