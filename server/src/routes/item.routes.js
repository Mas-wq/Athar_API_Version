import express from "express";

import {
  getAllFoundItems,
  getFoundItemById,
  getPublicLostReports,
} from "../controllers/item.controller.js";

import { optionalAuthenticateToken } from "../middlewares/optionalAuth.middleware.js";
import { getPublicAuctionById, getPublicAuctions } from "../controllers/auction.controller.js";

const router = express.Router();

router.get("/auctions", getPublicAuctions);
router.get("/auctions/:id", optionalAuthenticateToken, getPublicAuctionById);
router.get("/found-items", optionalAuthenticateToken, getAllFoundItems);
router.get("/found-items/:id", optionalAuthenticateToken, getFoundItemById);
router.get("/lost-reports", optionalAuthenticateToken, getPublicLostReports);

export default router;
