import "dotenv/config";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { usersTable } from "../models/index.js";

export const authenticateToken = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // CRITICAL: Check DB to see if user was deactivated while they were logged in
    const [user] = await db
      .select({ is_active: usersTable.is_active })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id));

    if (!user || !user.is_active) {
      res.clearCookie("token"); // Kick them out
      return res
        .status(403)
        .json({ message: "Account is inactive. Access denied." });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("token");
    return res.status(403).json({ message: "Invalid session" });
  }
};
