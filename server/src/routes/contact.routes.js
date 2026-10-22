import express from "express";
import { sendContactMessage } from "../controllers/contact.controller.js";

const router = express.Router();

// Contact endpoints
router.post("/send-message", sendContactMessage);

export default router;
