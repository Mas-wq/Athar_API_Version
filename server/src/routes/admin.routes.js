import express from "express";
import {
  getAllUsers,
  deactivateUser,
  activateUser,
  getDashboardStats,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/dashboard", getDashboardStats);

// User Management
router.get("/users", getAllUsers);

// User Status Management
router.patch("/users/:userId/deactivate", deactivateUser);
router.patch("/users/:userId/activate", activateUser);

export default router;
