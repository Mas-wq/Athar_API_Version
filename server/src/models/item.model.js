import {
  pgTable,
  uuid,
  pgEnum,
  timestamp,
  text,
  json,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { usersTable } from "./user.model.js";

export const foundItemStatusEnum = pgEnum("found_item_status", [
  "FOUND",
  "CLAIMED",
  "RETURNED",
  "IN_AUCTION",
  "SOLD",
  "UNCLAIMED",
]);

export const auctionStatusEnum = pgEnum("auction_status", [
  "OPEN",
  "AWAITING_PICKUP",
  "SOLD",
  "CANCELLED",
  "UNSOLD",
]);

export const bidStatusEnum = pgEnum("bid_status", ["VALID", "FORFEITED"]);

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
  auction_notice_at: timestamp("auction_notice_at", { withTimezone: true }),
  auction_opt_out: boolean("auction_opt_out").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auctionSettingsTable = pgTable("auction_settings", {
  id: integer("id").primaryKey().default(1),
  waiting_minutes: integer("waiting_minutes").notNull().default(43200),
  notice_minutes: integer("notice_minutes").notNull().default(4320),
  duration_minutes: integer("duration_minutes").notNull().default(10080),
  anti_sniping_minutes: integer("anti_sniping_minutes").notNull().default(10),
  start_price: integer("start_price").notNull().default(50),
  min_increment: integer("min_increment").notNull().default(10),
  pickup_minutes: integer("pickup_minutes").notNull().default(4320),
  strike_limit: integer("strike_limit").notNull().default(3),
  relist_start_price_percent: integer("relist_start_price_percent").notNull().default(50),
  excluded_types: json("excluded_types").notNull().default(sql`'[]'::json`),
  proceeds_note: text("proceeds_note").notNull().default("To be decided by the university"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auctionsTable = pgTable("auctions", {
  id: uuid("id").primaryKey().defaultRandom(),
  found_item_id: uuid("found_item_id").notNull().references(() => foundItemsTable.id, { onDelete: "cascade" }),
  finder_id: uuid("finder_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  status: auctionStatusEnum("status").notNull().default("OPEN"),
  start_price: integer("start_price").notNull(),
  min_increment: integer("min_increment").notNull(),
  reserve_price: integer("reserve_price"),
  current_price: integer("current_price").notNull().default(0),
  highest_bid_id: uuid("highest_bid_id"),
  winner_id: uuid("winner_id").references(() => usersTable.id, { onDelete: "set null" }),
  final_price: integer("final_price"),
  starts_at: timestamp("starts_at", { withTimezone: true }).notNull(),
  ends_at: timestamp("ends_at", { withTimezone: true }).notNull(),
  duration_minutes: integer("duration_minutes").notNull().default(10080),
  anti_sniping_minutes: integer("anti_sniping_minutes").notNull().default(10),
  pickup_minutes: integer("pickup_minutes").notNull().default(4320),
  pickup_deadline: timestamp("pickup_deadline", { withTimezone: true }),
  relist_count: integer("relist_count").notNull().default(0),
  relist_start_price_percent: integer("relist_start_price_percent").notNull().default(50),
  ending_soon_notified: boolean("ending_soon_notified").notNull().default(false),
  cancel_reason: text("cancel_reason"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  oneActiveAuctionPerFoundItem: uniqueIndex("auctions_one_active_per_found_item")
    .on(table.found_item_id)
    .where(sql`${table.status} IN ('OPEN', 'AWAITING_PICKUP')`),
}));

export const bidsTable = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  auction_id: uuid("auction_id").notNull().references(() => auctionsTable.id, { onDelete: "cascade" }),
  bidder_id: uuid("bidder_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: bidStatusEnum("status").notNull().default("VALID"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  auctionAmountIndex: index("bids_auction_amount_idx").on(table.auction_id, table.amount.desc()),
  bidderAuctionIndex: index("bids_bidder_auction_idx").on(table.bidder_id, table.auction_id),
}));

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
  kind: text("kind").notNull().default("CLAIM"),
  auction_id: uuid("auction_id").references(() => auctionsTable.id, { onDelete: "set null" }),
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

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  sender_id: uuid("sender_id").references(() => usersTable.id, { onDelete: "set null" }),
  sender_name: text("sender_name").notNull(),
  message_type: text("message_type").notNull().default("USER"),
  message: text("message").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Retained for compatibility with local chat history created by older versions.
export const claimMessagesTable = pgTable("claim_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  claim_id: uuid("claim_id").notNull().references(() => claimsTable.id, { onDelete: "cascade" }),
  sender_id: uuid("sender_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
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
