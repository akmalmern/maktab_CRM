const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");

function extractMonitoringToken(req) {
  const auth = req?.headers?.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const headerToken = req?.headers?.["x-monitoring-token"];
  return typeof headerToken === "string" && headerToken.trim() ? headerToken.trim() : null;
}

function requireMonitoringAccess(req, _res, next) {
  if (!env.MONITORING_TOKEN) {
    if (env.NODE_ENV !== "production") return next();
    return next(
      new ApiError(
        503,
        "MONITORING_DISABLED",
        "Monitoring token konfiguratsiya qilinmagan",
      ),
    );
  }

  const token = extractMonitoringToken(req);
  if (token !== env.MONITORING_TOKEN) {
    return next(
      new ApiError(401, "MONITORING_ACCESS_DENIED", "Monitoring endpoint uchun token noto'g'ri"),
    );
  }

  return next();
}

module.exports = {
  requireMonitoringAccess,
};
