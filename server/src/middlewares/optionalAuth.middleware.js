import "dotenv/config";
import jwt from "jsonwebtoken";

export const optionalAuthenticateToken = async (req, res, next) => {
  // 1. Look for the token in cookies
  const token = req.cookies?.token;

  // 2. If no token, just set user to null and move on
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach the user to the request
    req.user = decoded;
    next();
  } catch (error) {
    // If the token is invalid/expired, we don't block the request (since it's optional),
    // but we treat them as an unauthenticated guest.
    req.user = null;
    next();
  }
};
