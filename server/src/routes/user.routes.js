import express from "express";

import {
  reportLostItem,
  getMyReports,
  updateMyReport,
  deleteMyReport,
  createClaimQuestionSession,
  myClaimSubmit,
  getMyClaims,
  getMyClaimDetails,
  deleteMyClaim,
  getMyReportDetails,
  addFoundItem,
} from "../controllers/user.controller.js";
import {
  deleteMyFoundItem,
  getMyFoundItems,
} from "../controllers/foundItem.controller.js";
import { chatWithAiAgent, getAiChatHistory, getAiMatchAlerts } from "../controllers/aiAgent.controller.js";
import { strictRoleAuthorization } from "../middlewares/roleAuth.middleware.js";
import { finderWithdraw } from "../../services/auctionService.js";
import {
  getMyBids,
  getMyNotifications,
  getUnreadNotificationCount,
  readMyNotifications,
  submitBid,
} from "../controllers/auction.controller.js";

const router = express.Router();

router.post("/auctions/:id/bids", strictRoleAuthorization("USER"), submitBid);
router.get("/bids", strictRoleAuthorization("USER"), getMyBids);
router.get("/notifications", strictRoleAuthorization("USER"), getMyNotifications);
router.post("/notifications/read", strictRoleAuthorization("USER"), readMyNotifications);
router.get("/notifications/unread-count", strictRoleAuthorization("USER"), getUnreadNotificationCount);
router.post("/found-items/:id/auction/withdraw", strictRoleAuthorization("USER"), async (req, res) => {
  try {
    await finderWithdraw(req.params.id, req.user.id);
    return res.status(200).json({ success: true, message: "This item will not enter an auction" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Could not remove item from auction" });
  }
});

router.get("/ai/matches", getAiMatchAlerts);
router.get("/ai/chat-history", getAiChatHistory);
router.post("/ai/chat", chatWithAiAgent);

router.post("/lost-reports", reportLostItem);
router.post("/found-items", addFoundItem);
router.get("/found-items", getMyFoundItems);
router.delete("/found-items/:id", deleteMyFoundItem);

router.get("/lost-reports", getMyReports);

router.get("/lost-reports/:id", getMyReportDetails);

router.patch("/lost-reports/:id", updateMyReport);

router.delete("/lost-reports/:id", deleteMyReport);

router.post("/claims/:id", myClaimSubmit);
router.post("/claims/:id/questions", createClaimQuestionSession);

router.get("/claims", getMyClaims);

router.get("/claims/:id", getMyClaimDetails);

router.delete("/claims/:id", deleteMyClaim);

export default router;
