import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { conversationsTable, usersTable } from "./models/index.js";

let io;

const readCookie = (cookieHeader, name) => {
  const prefix = `${name}=`;
  const cookie = String(cookieHeader || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice(prefix.length)); }
  catch { return cookie.slice(prefix.length); }
};

export const createRealtimeServer = (httpServer, allowedOrigins, sendMessage) => {
  io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, "token");
      if (!token) return next(new Error("Unauthorized"));
      const user = jwt.verify(token, process.env.JWT_SECRET);
      const [activeUser] = await db.select({ is_active: usersTable.is_active })
        .from(usersTable).where(eq(usersTable.id, user.id));
      if (!activeUser?.is_active) return next(new Error("Account is inactive"));
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error("Invalid session"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);
    const expiryDelay = Number(socket.data.user.exp) * 1000 - Date.now();
    if (Number.isFinite(expiryDelay) && expiryDelay > 0) {
      const expiryTimer = setTimeout(() => socket.disconnect(true), expiryDelay);
      expiryTimer.unref?.();
      socket.once("disconnect", () => clearTimeout(expiryTimer));
    }

    socket.on("chat:join", async (payload = {}, callback) => {
      const acknowledge = typeof callback === "function" ? callback : () => {};
      try {
        const conversationId = payload?.conversationId;
        if (typeof conversationId !== "string" || conversationId.length > 64) {
          return acknowledge({ success: false, message: "Invalid chat" });
        }
        const [conversation] = await db.select({
          claimant_id: conversationsTable.claimant_id,
          finder_id: conversationsTable.finder_id,
        }).from(conversationsTable).where(eq(conversationsTable.id, conversationId));
        if (!conversation || ![conversation.claimant_id, conversation.finder_id].includes(userId)) {
          return acknowledge({ success: false, message: "This chat is not yours" });
        }
        await socket.join(`conversation:${conversationId}`);
        return acknowledge({ success: true });
      } catch {
        return acknowledge({ success: false, message: "Could not join this chat" });
      }
    });

    socket.on("chat:send", async (payload = {}, callback) => {
      const acknowledge = typeof callback === "function" ? callback : () => {};
      try {
        const result = await sendMessage({
          user: socket.data.user,
          conversationId: payload.conversationId,
          message: payload.message,
        });
        return acknowledge({ success: true, message: result });
      } catch (error) {
        return acknowledge({
          success: false,
          message: error.statusCode >= 400 && error.statusCode < 500 || error.statusCode === 503
            ? error.message
            : "Could not send your message",
        });
      }
    });
  });

  return io;
};

export const publishConversationMessage = async (conversationId, message) => {
  if (!io) return;
  const [conversation] = await db.select({
    claimant_id: conversationsTable.claimant_id,
    finder_id: conversationsTable.finder_id,
  }).from(conversationsTable).where(eq(conversationsTable.id, conversationId));
  if (!conversation) return;
  const payload = { conversationId, message };
  io.to(`conversation:${conversationId}`)
    .to(`user:${conversation.claimant_id}`)
    .to(`user:${conversation.finder_id}`)
    .emit("chat:message", payload);
};

export const disconnectUserSockets = (userId) => {
  io?.in(`user:${userId}`).disconnectSockets(true);
};
