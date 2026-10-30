import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../index.js";
import { conversationsTable, usersTable } from "../models/index.js";
import { appendConversationMessage } from "./chatStore.js";
import { publishConversationMessage } from "../realtime.js";

export const createSystemMessage = async (conversationId, message, {
  senderId = null,
  senderName = "Athar AI Assistant",
} = {}) => {
  const entry = {
    id: randomUUID(),
    conversation_id: conversationId,
    sender_id: senderId,
    sender_name: senderName,
    message_type: "SYSTEM",
    message,
    created_at: new Date().toISOString(),
  };
  try {
    await appendConversationMessage(conversationId, entry);
    await publishConversationMessage(conversationId, entry);
  } catch (error) {
    // A workflow state update must not be rolled back if Redis is temporarily unavailable.
    console.error("Could not append a temporary system chat message:", error.message);
  }
  return entry;
};

export const createUserConversationMessage = async ({ user, conversationId, message }) => {
  const content = typeof message === "string" ? message.trim() : "";
  if (!content || content.length > 2000) {
    throw Object.assign(new Error("Message must be between 1 and 2000 characters"), { statusCode: 400 });
  }

  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));
  if (!conversation) throw Object.assign(new Error("Chat not found"), { statusCode: 404 });
  if (![conversation.claimant_id, conversation.finder_id].includes(user.id)) {
    throw Object.assign(new Error("This chat is not yours"), { statusCode: 403 });
  }
  if (conversation.status !== "ACCEPTED") {
    throw Object.assign(new Error("Messaging opens after the claim is accepted"), { statusCode: 409 });
  }

  const [profile] = await db.select({ full_name: usersTable.full_name, is_active: usersTable.is_active }).from(usersTable)
    .where(eq(usersTable.id, user.id));
  if (!profile?.is_active) throw Object.assign(new Error("Account is inactive"), { statusCode: 403 });
  const createdAt = new Date();
  const entry = {
    id: randomUUID(),
    conversation_id: conversation.id,
    sender_id: user.id,
    sender_name: profile?.full_name || user.full_name || "Athar member",
    message_type: "USER",
    message: content,
    created_at: createdAt.toISOString(),
  };

  const [stillOpen] = await db.update(conversationsTable).set({ updated_at: createdAt })
    .where(and(eq(conversationsTable.id, conversation.id), eq(conversationsTable.status, "ACCEPTED")))
    .returning({ id: conversationsTable.id });
  if (!stillOpen) throw Object.assign(new Error("Messaging is no longer available for this chat"), { statusCode: 409 });
  await appendConversationMessage(conversation.id, entry);
  await publishConversationMessage(conversation.id, entry);
  return entry;
};
