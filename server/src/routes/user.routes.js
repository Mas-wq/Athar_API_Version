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

const router = express.Router();

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
