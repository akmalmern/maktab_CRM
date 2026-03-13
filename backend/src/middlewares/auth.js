const { verifyAccess } = require("../utils/tokens");
const { ApiError } = require("../utils/apiError");
const { queueAuthEvent } = require("../services/security/securityEventService");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    queueAuthEvent({
      action: "AUTH_ACCESS",
      outcome: "FAILURE",
      reason: "UNAUTHORIZED",
      req,
      persist: false,
      details: { source: "bearer" },
    });
    return next(
      new ApiError(401, "UNAUTHORIZED", "Token yo'q (Bearer token kerak)"),
    );
  }

  try {
    req.user = verifyAccess(token); // { sub, role }
    next();
  } catch (e) {
    queueAuthEvent({
      action: "AUTH_ACCESS",
      outcome: "FAILURE",
      reason: "TOKEN_INVALID",
      req,
      persist: true,
      details: { source: "bearer" },
    });
    next(new ApiError(401, "TOKEN_INVALID", "Token noto'g'ri yoki eskirgan"));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return next(new ApiError(401, "UNAUTHORIZED", "Login qiling"));
    if (!roles.includes(req.user.role)) {
      queueAuthEvent({
        action: "AUTH_ROLE_CHECK",
        outcome: "FAILURE",
        actorUserId: req.user?.sub || null,
        req,
        persist: false,
        reason: "FORBIDDEN",
        details: { requiredRoles: roles, actualRole: req.user.role },
      });
      return next(new ApiError(403, "FORBIDDEN", "Ruxsat yo'q"));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
