import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
  decideClaim,
  getConversation,
  listConversations,
  getUnreadMessageCount,
  markConversationRead,
  markConversationDelivered,
  createHandoverRequest,
  confirmHandover,
  disputeHandover,
  resolveHandoverDispute,
  sendConversationMessage,
} from "../controllers/conversation.controller.js";

const router = express.Router();
router.get("/conversations", authenticateToken, listConversations);
router.get("/unread-count", authenticateToken, getUnreadMessageCount);
router.post("/conversations/:conversationId/read", authenticateToken, markConversationRead);
router.get("/conversations/:conversationId", authenticateToken, getConversation);
router.post("/conversations/:conversationId/messages", authenticateToken, sendConversationMessage);
router.patch("/conversations/:conversationId/decision", authenticateToken, decideClaim);
router.patch("/conversations/:conversationId/delivered", authenticateToken, markConversationDelivered);
router.post("/conversations/:conversationId/handover", authenticateToken, createHandoverRequest);
router.post("/conversations/:conversationId/handover/confirm", authenticateToken, confirmHandover);
router.post("/conversations/:conversationId/handover/dispute", authenticateToken, disputeHandover);
router.post("/conversations/:conversationId/handover/resolve", authenticateToken, resolveHandoverDispute);

export default router;
