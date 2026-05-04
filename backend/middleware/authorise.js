export const authorise = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      const user = req.user; // set by your authenticate middleware

      if (!user || !user.role) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient permissions",
        });
      }

      next();
    } catch (error) {
      console.error("authorise middleware error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};