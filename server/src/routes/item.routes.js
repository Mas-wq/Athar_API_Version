import express from "express";

import {
  getAllFoundItems,
  getFoundItemById,
  getPublicLostReports,
} from "../controllers/item.controller.js";

import { optionalAuthenticateToken } from "../middlewares/optionalAuth.middleware.js";

const router = express.Router();

router.get("/found-items", optionalAuthenticateToken, getAllFoundItems);
router.get("/found-items/:id", optionalAuthenticateToken, getFoundItemById);
router.get("/lost-reports", optionalAuthenticateToken, getPublicLostReports);

export default router;
