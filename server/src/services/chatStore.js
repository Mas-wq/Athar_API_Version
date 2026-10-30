import { createClient } from "redis";

const CHAT_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_MESSAGES_PER_KEY = 100;
const CONVERSATION_PREFIX = "athar:conversation:";
const AI_CHAT_PREFIX = "athar:ai-chat:user:";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export const connectRedis = async () => {
  if (redisClient.isOpen) return;
  try {
    await redisClient.connect();
    console.log("Redis is ready for temporary chat history.");
  } catch (error) {
    // node-redis keeps reconnecting after transient connection errors.
    // The rest of the application may start, but chat operations return 503 until Redis is ready.
    console.error("Redis is unavailable; chat messages are temporarily disabled:", error.message);
  }
};

const requireRedis = () => {
  if (!redisClient.isReady) {
    const error = new Error("Chat storage is temporarily unavailable. Please try again shortly.");
    error.statusCode = 503;
    throw error;
  }
};

const parseEntries = (values) => values.flatMap((value) => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? [parsed] : [];
  } catch {
    return [];
  }
});

export const getConversationMessages = async (conversationId) => {
  requireRedis();
  const values = await redisClient.lRange(`${CONVERSATION_PREFIX}${conversationId}:messages`, 0, -1);
  return parseEntries(values);
};

export const appendConversationMessage = async (conversationId, message) => {
  requireRedis();
  const key = `${CONVERSATION_PREFIX}${conversationId}:messages`;
  await redisClient.multi()
    .rPush(key, JSON.stringify(message))
    .lTrim(key, -MAX_MESSAGES_PER_KEY, -1)
    .expire(key, CHAT_TTL_SECONDS)
    .exec();
  return message;
};

export const getAiChatMessages = async (userId) => {
  requireRedis();
  const values = await redisClient.lRange(`${AI_CHAT_PREFIX}${userId}`, 0, -1);
  return parseEntries(values);
};

export const appendAiChatMessages = async (userId, messages) => {
  requireRedis();
  if (!Array.isArray(messages) || !messages.length) return;
  const key = `${AI_CHAT_PREFIX}${userId}`;
  await redisClient.multi()
    .rPush(key, messages.map((message) => JSON.stringify(message)))
    .lTrim(key, -MAX_MESSAGES_PER_KEY, -1)
    .expire(key, CHAT_TTL_SECONDS)
    .exec();
};
