const { ApiError } = require("../utils/apiError");

function createMemoryRateLimiter({
  windowMs,
  max,
  code = "RATE_LIMITED",
  message = "Juda ko'p so'rov yuborildi",
  keyGenerator,
}) {
  const store = new Map();
  const resolveKey =
    keyGenerator ||
    ((req) => req.ip || req.headers["x-forwarded-for"] || "unknown");

  return function rateLimit(req, res, next) {
    const key = resolveKey(req);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return next(new ApiError(429, code, message, { retryAfterSec }));
    }

    entry.count += 1;
    store.set(key, entry);
    return next();
  };
}

const loginRateLimit = createMemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 20,
  code: "LOGIN_RATE_LIMIT",
  message: "Juda ko'p login urinishlari. Keyinroq qayta urinib ko'ring.",
});

const refreshRateLimit = createMemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 60,
  code: "REFRESH_RATE_LIMIT",
  message: "Token yangilash so'rovlari haddan oshdi.",
});

module.exports = {
  createMemoryRateLimiter,
  loginRateLimit,
  refreshRateLimit,
};
