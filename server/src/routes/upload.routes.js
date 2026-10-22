import express from "express";
import { uploadImages } from "../controllers/upload.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.post("/images", authenticateToken, uploadImages);
export default router;
