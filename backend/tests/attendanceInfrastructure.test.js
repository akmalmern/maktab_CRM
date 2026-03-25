const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createAttendanceInfrastructure,
} = require("../src/services/attendance/shared/attendanceInfrastructure");

test("ensureMainOrganization configured main organization bilan upsert qiladi", async () => {
  let upsertArgs = null;
  const { ensureMainOrganization } = createAttendanceInfrastructure({
    mainOrgKey: "MAIN",
    mainOrgName: "Asosiy tashkilot",
  });

  const result = await ensureMainOrganization({
    organization: {
      upsert: async (args) => {
        upsertArgs = args;
        return { id: "org_1" };
      },
    },
  });

  assert.equal(upsertArgs.where.key, "MAIN");
  assert.equal(upsertArgs.create.name, "Asosiy tashkilot");
  assert.deepEqual(result, { id: "org_1" });
});
