/** Authorization middleware for admin-only routes; admins also use community routes. */
export const roleAuthorization = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (userRole === "ADMIN") {
      return next();
    }

    // Check if user's role is in the allowed roles list
    if (allowedRoles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({
      message: "Forbidden: You do not have permission to access this resource",
    });
  };
};

/**
 * Strict role authorization - user must have EXACTLY this role.
 * Use this when you want to prevent ADMIN from accessing certain routes.
 */
export const strictRoleAuthorization = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({
        message: "Forbidden: Insufficient role",
      });
    }
    next();
  };
};
