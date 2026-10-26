import express from "express";
import {
  getAllUsers,
  deactivateUser,
  activateUser,
  getDashboardStats,
} from "../controllers/admin.controller.js";
import {
  cancelAdminAuction,
  getAdminAuctionById,
  getAdminAuctions,
  getAdminAuctionSettings,
  putAdminAuctionSettings,
  setAdminAuctionReserve,
  updateAdminUserStrikes,
} from "../controllers/auction.controller.js";

const router = express.Router();

router.get("/dashboard", getDashboardStats);
router.get("/auction-settings", getAdminAuctionSettings);
router.put("/auction-settings", putAdminAuctionSettings);
router.get("/auctions", getAdminAuctions);
router.get("/auctions/:id", getAdminAuctionById);
router.patch("/auctions/:id/reserve", setAdminAuctionReserve);
router.post("/auctions/:id/cancel", cancelAdminAuction);

// User Management
router.get("/users", getAllUsers);

// User Status Management
router.patch("/users/:userId/deactivate", deactivateUser);
router.patch("/users/:userId/activate", activateUser);
router.patch("/users/:userId/strikes", updateAdminUserStrikes);

export default router;
