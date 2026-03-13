const prisma = require("../../prisma");
const { logger, serializeError } = require("../../utils/logger");
const { recordAuthEvent } = require("../observability/metricsService");

const MAIN_ORG_KEY = "MAIN";
const MAIN_ORG_NAME = "Asosiy tashkilot";
const securityLogger = logger.child({ component: "security_event" });

let cachedMainOrgId = null;

function buildRequestMeta(req) {
  const xff = req?.headers?.["x-forwarded-for"];
  const ip = typeof xff === "string" && xff.trim()
    ? xff.split(",")[0].trim()
    : req?.ip || req?.socket?.remoteAddress || null;
  const userAgent = req?.headers?.["user-agent"]
    ? String(req.headers["user-agent"]).slice(0, 512)
    : null;
  return {
    requestId: req?.requestId || null,
    ip,
    userAgent,
  };
}

async function getMainOrganizationId(prismaClient = prisma) {
  if (cachedMainOrgId && prismaClient === prisma) return cachedMainOrgId;
  const org = await prismaClient.organization.upsert({
    where: { key: MAIN_ORG_KEY },
    update: {},
    create: { key: MAIN_ORG_KEY, name: MAIN_ORG_NAME },
    select: { id: true },
  });
  if (prismaClient === prisma) {
    cachedMainOrgId = org.id;
  }
  return org.id;
}

async function persistSecurityAudit({
  prismaClient = prisma,
  action,
  actorUserId = null,
  entityId,
  reason = null,
  req,
  after = null,
}) {
  const organizationId = await getMainOrganizationId(prismaClient);
  const meta = buildRequestMeta(req);
  return prismaClient.auditLog.create({
    data: {
      organizationId,
      actorUserId,
      action,
      entityType: "SECURITY_EVENT",
      entityId: String(entityId || meta.requestId || "anonymous"),
      reason,
      ip: meta.ip,
      userAgent: meta.userAgent,
      after,
    },
  });
}

async function logAuthEvent({
  action,
  outcome,
  actorUserId = null,
  username = null,
  reason = null,
  req = null,
  details = null,
  persist = false,
  prismaClient = prisma,
}) {
  const meta = buildRequestMeta(req);
  const event = {
    action,
    outcome,
    actorUserId,
    username,
    reason,
    requestId: meta.requestId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: details || null,
  };

  recordAuthEvent({ action, outcome });
  const level = outcome === "SUCCESS" ? "info" : outcome === "RATE_LIMITED" ? "warn" : "warn";
  (req?.log || securityLogger)[level]("auth_event", event);

  if (!persist) return;

  try {
    await persistSecurityAudit({
      prismaClient,
      action,
      actorUserId,
      entityId: actorUserId || username || meta.requestId || "anonymous",
      reason: reason || outcome,
      req,
      after: {
        outcome,
        username,
        details: details || null,
      },
    });
  } catch (error) {
    (req?.log || securityLogger).warn("auth_event_audit_failed", {
      action,
      outcome,
      error: serializeError(error),
    });
  }
}

function queueAuthEvent(params) {
  Promise.resolve()
    .then(() => logAuthEvent(params))
    .catch((error) => {
      securityLogger.warn("auth_event_async_failed", {
        action: params?.action || "UNKNOWN",
        error: serializeError(error),
      });
    });
}

module.exports = {
  buildRequestMeta,
  logAuthEvent,
  queueAuthEvent,
  getMainOrganizationId,
};
