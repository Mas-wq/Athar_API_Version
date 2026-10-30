import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../index.js";
import { notificationsTable } from "../models/index.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await db.select({
      id: notificationsTable.id,
      type: notificationsTable.type,
      title: notificationsTable.title,
      body: notificationsTable.body,
      link: notificationsTable.link,
      read_at: notificationsTable.read_at,
      created_at: notificationsTable.created_at,
    }).from(notificationsTable)
      .where(eq(notificationsTable.user_id, req.user.id))
      .orderBy(desc(notificationsTable.created_at)).limit(30);
    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Could not load notifications:", error);
    return res.status(500).json({ message: "Could not load notifications" });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const [result] = await db.select({ value: count() }).from(notificationsTable)
      .where(and(eq(notificationsTable.user_id, req.user.id), isNull(notificationsTable.read_at)));
    return res.status(200).json({ unread_count: Number(result?.value || 0) });
  } catch (error) {
    console.error("Could not count notifications:", error);
    return res.status(500).json({ message: "Could not count notifications" });
  }
};

export const readMyNotifications = async (req, res) => {
  try {
    const notificationIds = req.body?.notification_ids;
    if (notificationIds !== undefined && !Array.isArray(notificationIds)) {
      return res.status(400).json({ message: "notification_ids must be a list" });
    }
    if (Array.isArray(notificationIds) && (
      notificationIds.length > 100 || notificationIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))
    )) {
      return res.status(400).json({ message: "notification_ids must contain up to 100 notification IDs" });
    }
    if (Array.isArray(notificationIds) && notificationIds.length === 0) {
      return res.status(200).json({ success: true, updated_count: 0 });
    }

    const conditions = [eq(notificationsTable.user_id, req.user.id), isNull(notificationsTable.read_at)];
    if (Array.isArray(notificationIds)) conditions.push(inArray(notificationsTable.id, notificationIds));
    const updated = await db.update(notificationsTable).set({ read_at: new Date() })
      .where(and(...conditions)).returning({ id: notificationsTable.id });
    return res.status(200).json({ success: true, updated_count: updated.length });
  } catch (error) {
    console.error("Could not mark notifications as read:", error);
    return res.status(500).json({ message: "Could not mark notifications as read" });
  }
};
