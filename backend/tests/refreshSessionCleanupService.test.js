const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanupRefreshSessions,
} = require("../src/services/refreshSessionCleanupService");

test("cleanupRefreshSessions deletes expired and old revoked sessions", async () => {
  let capturedWhere = null;
  const prismaClient = {
    refreshSession: {
      deleteMany: async ({ where }) => {
        capturedWhere = where;
        return { count: 7 };
      },
    },
  };

  const now = new Date("2026-03-12T00:00:00.000Z");
  const result = await cleanupRefreshSessions({
    prismaClient,
    now,
    revokedRetentionDays: 30,
  });

  assert.equal(result.deletedCount, 7);
  assert.equal(result.executedAt.toISOString(), now.toISOString());
  assert.equal(result.revokedCutoff.toISOString(), "2026-02-10T00:00:00.000Z");
  assert.ok(capturedWhere);
  assert.equal(Array.isArray(capturedWhere.OR), true);
  assert.equal(capturedWhere.OR.length, 2);
});
