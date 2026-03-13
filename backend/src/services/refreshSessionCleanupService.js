const prisma = require("../prisma");
const { env } = require("../config/env");
const { logger } = require("../utils/logger");
const refreshSessionLogger = logger.child({ component: "refresh_session_cleanup" });

function buildRevokedCutoff(now, retentionDays) {
  const safeDays = Math.max(1, Number(retentionDays || 30));
  return new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
}

async function cleanupRefreshSessions({
  prismaClient = prisma,
  now = new Date(),
  revokedRetentionDays = env.REFRESH_SESSION_REVOKED_RETENTION_DAYS,
} = {}) {
  const revokedCutoff = buildRevokedCutoff(now, revokedRetentionDays);
  const result = await prismaClient.refreshSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lte: now } },
        {
          revokedAt: {
            not: null,
            lte: revokedCutoff,
          },
        },
      ],
    },
  });

  return {
    deletedCount: Number(result?.count || 0),
    revokedCutoff,
    executedAt: now,
  };
}

let cleanupRunning = false;

async function runRefreshSessionCleanupTick() {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const result = await cleanupRefreshSessions();
    refreshSessionLogger.info("refresh_session_cleanup_completed", {
      deletedCount: result.deletedCount,
      revokedCutoff: result.revokedCutoff,
    });
  } catch (error) {
    refreshSessionLogger.error("refresh_session_cleanup_failed", {
      error,
    });
  } finally {
    cleanupRunning = false;
  }
}

module.exports = {
  cleanupRefreshSessions,
  runRefreshSessionCleanupTick,
};
