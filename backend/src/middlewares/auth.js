const { verifyAccess } = require("../utils/tokens");
const { ApiError } = require("../utils/apiError");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token)
    return next(
      new ApiError(401, "UNAUTHORIZED", "Token yo‘q (Bearer token kerak)"),
    );

  try {
    req.user = verifyAccess(token); // { sub, role }
    next();
  } catch (e) {
    next(new ApiError(401, "TOKEN_INVALID", "Token noto‘g‘ri yoki eskirgan"));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return next(new ApiError(401, "UNAUTHORIZED", "Login qiling"));
    if (!roles.includes(req.user.role))
      return next(new ApiError(403, "FORBIDDEN", "Ruxsat yo‘q"));
    next();
  };
}

module.exports = { requireAuth, requireRole };
