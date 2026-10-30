import {
  pgTable,
  varchar,
  uuid,
  pgEnum,
  boolean,
  timestamp,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STAFF", "USER"]);

// --- FINAL USERS TABLE ---
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  full_name: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").notNull().default("USER"),
  is_active: boolean("is_active").notNull().default(true),
  // Better to default to true here because they already verified to get in
  email_verified: boolean("email_verified").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- PENDING USERS TABLE ---
export const usersPendingTable = pgTable("users_pending", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  full_name: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").notNull().default("USER"),

  otp_verification_code: varchar("otp_verification_code", {
    length: 10,
  }).notNull(),
  otp_expires_at: timestamp("otp_expires_at", { withTimezone: true }).notNull(),

  // Security addition: tracking attempts
  otp_attempts: integer("otp_attempts").notNull().default(0),

  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- PASSWORD RESET TABLE ---
export const passwordResetTable = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  reset_code: varchar("reset_code", { length: 10 }).notNull(),
  reset_expires_at: timestamp("reset_expires_at", {
    withTimezone: true,
  }).notNull(),
  is_used: boolean("is_used").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
