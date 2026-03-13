const prisma = require("../prisma");
const { env } = require("../config/env");
const { ApiError } = require("../utils/apiError");
const { logger, serializeError } = require("../utils/logger");
const { recordRateLimitDecision } = require("../services/observability/metricsService");
const { queueAuthEvent } = require("../services/security/securityEventService");

const rateLimitLogger = logger.child({ component: "rate_limit" });

function normalizeIp(req) {
  const xff = req?.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || "unknown";
}

function createMemoryRateLimitStore() {
  const store = new Map();

  return {
    mode: "memory",
    async consume({ bucketName, bucketKey, windowMs, max }) {
      const key = `${bucketName}:${bucketKey}`;
      const now = Date.now();
      const current = store.get(key);

      if (!current || now > current.resetAt) {
        const next = { count: 1, resetAt: now + windowMs };
        store.set(key, next);
        return {
          allowed: true,
          count: next.count,
          remaining: Math.max(0, max - next.count),
          resetAt: new Date(next.resetAt),
          retryAfterSec: 0,
        };
      }

      current.count += 1;
      store.set(key, current);
      const retryAfterSec = current.count > max
        ? Math.max(1, Math.ceil((current.resetAt - now) / 1000))
        : 0;

      return {
        allowed: current.count <= max,
        count: current.count,
        remaining: Math.max(0, max - current.count),
        resetAt: new Date(current.resetAt),
        retryAfterSec,
      };
    },
  };
}

function createDatabaseRateLimitStore({
  prismaClient = prisma,
  cleanupEvery = 100,
  retentionMs = 24 * 60 * 60 * 1000,
} = {}) {
  let hits = 0;

  async function maybeCleanup() {
    hits += 1;
    if (hits % cleanupEvery !== 0) return;
    try {
      await prismaClient.$executeRaw`
        DELETE FROM "RateLimitBucket"
        WHERE "resetAt" < ${new Date(Date.now() - retentionMs)}
      `;
    } catch (error) {
      rateLimitLogger.warn("rate_limit_cleanup_failed", {
        error: serializeError(error),
      });
    }
  }

  return {
    mode: "db",
    async consume({ bucketName, bucketKey, windowMs, max }) {
      const nextResetAt = new Date(Date.now() + windowMs);
      const rows = await prismaClient.$queryRaw`
        INSERT INTO "RateLimitBucket" (
          "bucketName",
          "bucketKey",
          "count",
          "resetAt",
          "lastSeenAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${bucketName},
          ${bucketKey},
          1,
          ${nextResetAt},
          NOW(),
          NOW(),
          NOW()
        )
        ON CONFLICT ("bucketName", "bucketKey")
        DO UPDATE SET
          "count" = CASE
            WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
            ELSE "RateLimitBucket"."count" + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${nextResetAt}
            ELSE "RateLimitBucket"."resetAt"
          END,
          "lastSeenAt" = NOW(),
          "updatedAt" = NOW()
        RETURNING "count", "resetAt"
      `;

      await maybeCleanup();

      const row = rows?.[0] || { count: 1, resetAt: nextResetAt };
      const count = Number(row.count || 0);
      const resetAt = row.resetAt instanceof Date ? row.resetAt : new Date(row.resetAt);
      const retryAfterSec = count > max
        ? Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))
        : 0;

      return {
        allowed: count <= max,
        count,
        remaining: Math.max(0, max - count),
        resetAt,
        retryAfterSec,
      };
    },
  };
}

let sharedStore = null;

function resolveSharedStore() {
  if (sharedStore) return sharedStore;
  const mode = env.RATE_LIMIT_STORE === "auto"
    ? env.NODE_ENV === "production"
      ? "db"
      : "memory"
    : env.RATE_LIMIT_STORE;

  sharedStore = mode === "db"
    ? createDatabaseRateLimitStore({
      cleanupEvery: env.RATE_LIMIT_DB_CLEANUP_EVERY,
      retentionMs: env.RATE_LIMIT_DB_RETENTION_HOURS * 60 * 60 * 1000,
    })
    : createMemoryRateLimitStore();

  rateLimitLogger.info("rate_limit_store_initialized", {
    mode: sharedStore.mode,
  });

  return sharedStore;
}

function setRateLimitHeaders(res, { max, remaining, resetAt, windowMs }) {
  const resetSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
  res.setHeader("RateLimit-Policy", `${max};w=${Math.ceil(windowMs / 1000)}`);
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, remaining)));
  res.setHeader("RateLimit-Reset", String(resetSeconds));
}

function createRateLimiter({
  bucketName,
  windowMs,
  max,
  code = "RATE_LIMITED",
  message = "Juda ko'p so'rov yuborildi",
  keyGenerator,
  store = resolveSharedStore(),
  onBlocked,
}) {
  const resolveKey = keyGenerator || ((req) => normalizeIp(req));

  return async function rateLimit(req, res, next) {
    const bucketKey = String(resolveKey(req) || "unknown");

    try {
      const result = await store.consume({
        bucketName,
        bucketKey,
        windowMs,
        max,
      });

      setRateLimitHeaders(res, {
        max,
        remaining: result.remaining,
        resetAt: result.resetAt,
        windowMs,
      });

      if (result.allowed) {
        recordRateLimitDecision({
          bucketName,
          outcome: "ALLOWED",
          storeMode: store.mode,
        });
        return next();
      }

      res.setHeader("Retry-After", String(result.retryAfterSec));
      recordRateLimitDecision({
        bucketName,
        outcome: "BLOCKED",
        storeMode: store.mode,
      });

      if (typeof onBlocked === "function") {
        onBlocked(req, {
          bucketName,
          bucketKey,
          retryAfterSec: result.retryAfterSec,
          resetAt: result.resetAt,
          count: result.count,
          limit: max,
        });
      }

      return next(new ApiError(429, code, message, {
        bucketName,
        retryAfterSec: result.retryAfterSec,
        limit: max,
        resetAt: result.resetAt.toISOString(),
      }));
    } catch (error) {
      rateLimitLogger.error("rate_limit_store_failed", {
        bucketName,
        storeMode: store.mode,
        error: serializeError(error),
      });

      if (env.NODE_ENV !== "production") {
        return next();
      }

      return next(
        new ApiError(
          503,
          "RATE_LIMIT_STORE_UNAVAILABLE",
          "Rate limit xizmati vaqtincha ishlamayapti",
          { bucketName, storeMode: store.mode },
        ),
      );
    }
  };
}

function createMemoryRateLimiter(options) {
  return createRateLimiter({
    ...options,
    store: createMemoryRateLimitStore(),
  });
}

const loginRateLimit = createRateLimiter({
  bucketName: "auth_login",
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.LOGIN_RATE_LIMIT_MAX,
  code: "LOGIN_RATE_LIMIT",
  message: "Juda ko'p login urinishlari. Keyinroq qayta urinib ko'ring.",
  keyGenerator: (req) => {
    const ip = normalizeIp(req);
    const username = String(req?.body?.username || "").trim().toLowerCase() || "_";
    return `${ip}:${username}`;
  },
  onBlocked: (req, details) => {
    queueAuthEvent({
      action: "AUTH_LOGIN",
      outcome: "RATE_LIMITED",
      username: String(req?.body?.username || "").trim().toLowerCase() || null,
      req,
      persist: true,
      reason: "LOGIN_RATE_LIMIT",
      details,
    });
  },
});

const refreshRateLimit = createRateLimiter({
  bucketName: "auth_refresh",
  windowMs: env.REFRESH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: env.REFRESH_RATE_LIMIT_MAX,
  code: "REFRESH_RATE_LIMIT",
  message: "Token yangilash so'rovlari haddan oshdi.",
  keyGenerator: (req) => normalizeIp(req),
  onBlocked: (req, details) => {
    queueAuthEvent({
      action: "AUTH_REFRESH",
      outcome: "RATE_LIMITED",
      actorUserId: req.user?.sub || null,
      req,
      persist: true,
      reason: "REFRESH_RATE_LIMIT",
      details,
    });
  },
});

module.exports = {
  normalizeIp,
  createRateLimiter,
  createMemoryRateLimitStore,
  createDatabaseRateLimitStore,
  createMemoryRateLimiter,
  loginRateLimit,
  refreshRateLimit,
};
