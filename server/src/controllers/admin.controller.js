import { and, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { claimsTable, foundItemsTable, lostReportsTable, usersTable } from "../models/index.js";
import { isGroqConfigured } from "../../services/matchingService.js";
import { disconnectUserSockets } from "../realtime.js";

export const getDashboardStats = async (_req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [[reports], [delivered], [approvedThisWeek], [claims]] = await Promise.all([
      db.select({ value: count() }).from(lostReportsTable),
      db.select({ value: count() }).from(foundItemsTable).where(eq(foundItemsTable.status, "RETURNED")),
      db.select({ value: count() }).from(claimsTable).where(and(inArray(claimsTable.status, ["APPROVED", "COLLECTED"]), gte(claimsTable.approved_at, weekAgo))),
      db.select({ value: count() }).from(claimsTable).where(inArray(claimsTable.status, ["APPROVED", "COLLECTED"])),
    ]);
    const chatConfigured = isGroqConfigured("chat");
    const verificationConfigured = isGroqConfigured("verification");
    const chatModel = process.env.GROQ_CHAT_MODEL?.trim() || "allam-2-7b";
    const verificationModel = process.env.GROQ_VERIFICATION_MODEL?.trim() || "qwen/qwen3.8-27b";
    const aiAgent = {
      provider: "Groq API",
      status: chatConfigured && verificationConfigured ? "configured" : "missing_key",
      agent: "Athar Groq AI",
      agent_model: chatModel,
      chat_provider: "Groq API",
      chat_status: chatConfigured ? "configured" : "missing_key",
      chat_model: chatModel,
      matching_provider: "Groq API",
      matching_status: verificationConfigured ? "configured" : "missing_key",
      matching_model: verificationModel,
      text_model: verificationModel,
      vision_model: verificationModel,
      agent_available: chatConfigured,
      vision_available: verificationConfigured,
    };
    return res.status(200).json({ success: true, data: {
      ai_agent: aiAgent,
      total_reports: Number(reports.value),
      delivered_items: Number(delivered.value),
      claims_approved_last_7_days: Number(approvedThisWeek.value),
      claims_approved_total: Number(claims.value),
    } });
  } catch (error) {
    console.error("Could not load admin dashboard:", error);
    return res.status(500).json({ message: "Could not load dashboard statistics" });
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      full_name: usersTable.full_name,
      email_verified: usersTable.email_verified,
      is_active: usersTable.is_active,
      created_at: usersTable.created_at,
    }).from(usersTable).where(eq(usersTable.role, "USER")).orderBy(usersTable.created_at);
    return res.status(200).json({ users });
  } catch (error) {
    console.error("Could not load users:", error);
    return res.status(500).json({ message: "Could not load users" });
  }
};

const setUserActive = async (req, res, active) => {
  const { userId } = req.params;
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== "USER") return res.status(404).json({ message: "User not found" });
    if (user.id === req.user.id) return res.status(400).json({ message: "You cannot deactivate your own account" });
    if (user.is_active === active) return res.status(400).json({ message: active ? "User is already active" : "User is already deactivated" });
    await db.update(usersTable).set({ is_active: active, updated_at: new Date() }).where(eq(usersTable.id, userId));
    if (!active) disconnectUserSockets(userId);
    return res.status(200).json({ message: active ? "User activated" : "User deactivated" });
  } catch (error) {
    console.error("Could not update user status:", error);
    return res.status(500).json({ message: "Could not update user status" });
  }
};

export const deactivateUser = (req, res) => setUserActive(req, res, false);
export const activateUser = (req, res) => setUserActive(req, res, true);
