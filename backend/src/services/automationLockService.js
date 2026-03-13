const prisma = require("../prisma");
const { logger } = require("../utils/logger");
const lockLogger = logger.child({ component: "automation_lock" });

async function tryAcquireDistributedLock({
  key,
  prismaClient = prisma,
} = {}) {
  const lockKey = String(key || "").trim();
  if (!lockKey) return true;
  try {
    const rows = await prismaClient.$queryRaw`
      SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
    `;
    return Boolean(rows?.[0]?.locked);
  } catch (error) {
    lockLogger.warn("automation_lock_acquire_failed", {
      lockKey,
      mode: "fail_closed",
      error,
    });
    return false;
  }
}

async function releaseDistributedLock({
  key,
  prismaClient = prisma,
} = {}) {
  const lockKey = String(key || "").trim();
  if (!lockKey) return;
  try {
    await prismaClient.$executeRaw`
      SELECT pg_advisory_unlock(hashtext(${lockKey}))
    `;
  } catch (error) {
    lockLogger.warn("automation_lock_release_failed", {
      lockKey,
      error,
    });
  }
}

module.exports = {
  tryAcquireDistributedLock,
  releaseDistributedLock,
};
