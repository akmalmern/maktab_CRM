const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const { createPayrollInfrastructure } = require("../src/services/payroll/shared/payrollInfrastructure");

function cleanOptional(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function createInfrastructure() {
  return createPayrollInfrastructure({
    ApiError,
    cleanOptional,
    mainOrgKey: "MAIN",
    mainOrgName: "Asosiy tashkilot",
  });
}

test("ensureMainOrganization configured main organization bilan upsert qiladi", async () => {
  const { ensureMainOrganization } = createInfrastructure();
  let upsertArgs = null;

  const result = await ensureMainOrganization({
    organization: {
      upsert: async (args) => {
        upsertArgs = args;
        return { id: "org_1", key: args.where.key, name: args.create.name };
      },
    },
  });

  assert.equal(upsertArgs.where.key, "MAIN");
  assert.equal(upsertArgs.create.name, "Asosiy tashkilot");
  assert.deepEqual(result, {
    id: "org_1",
    key: "MAIN",
    name: "Asosiy tashkilot",
  });
});

test("resolvePayrollRunActorUserId preferred id ni qaytaradi yoki aktiv admin topadi", async () => {
  const { resolvePayrollRunActorUserId } = createInfrastructure();

  const preferred = await resolvePayrollRunActorUserId(
    {
      user: {
        findFirst: async () => {
          throw new Error("should not query when preferred id exists");
        },
      },
    },
    "user_1",
  );
  assert.equal(preferred, "user_1");

  const fallback = await resolvePayrollRunActorUserId({
    user: {
      findFirst: async () => ({ id: "admin_1" }),
    },
  });
  assert.equal(fallback, "admin_1");
});

test("resolvePayrollRunActorUserId admin topilmasa error beradi", async () => {
  const { resolvePayrollRunActorUserId } = createInfrastructure();

  await assert.rejects(
    resolvePayrollRunActorUserId({
      user: {
        findFirst: async () => null,
      },
    }),
    (error) => {
      assert.equal(error.code, "PAYROLL_RUN_ACTOR_REQUIRED");
      return true;
    },
  );
});

test("createAuditLog request meta ni payloadga qo'shadi", async () => {
  const { createAuditLog } = createInfrastructure();
  let createArgs = null;

  await createAuditLog(
    {
      auditLog: {
        create: async (args) => {
          createArgs = args;
          return { id: "audit_1" };
        },
      },
    },
    {
      organizationId: "org_1",
      actorUserId: "user_1",
      action: "PAYROLL_TEST",
      entityType: "PAYROLL_RUN",
      entityId: "run_1",
      payrollRunId: "run_1",
      before: { status: "DRAFT" },
      after: { status: "APPROVED" },
      reason: "manual check",
      req: {
        headers: {
          "x-forwarded-for": " 10.0.0.1 ",
          "user-agent": " Mozilla ",
        },
      },
    },
  );

  assert.equal(createArgs.data.ip, "10.0.0.1");
  assert.equal(createArgs.data.userAgent, "Mozilla");
  assert.equal(createArgs.data.reason, "manual check");
  assert.deepEqual(createArgs.data.after, { status: "APPROVED" });
});

test("createPayrollCashEntry trim qiladi va defaultsni to'g'ri beradi", async () => {
  const { createPayrollCashEntry } = createInfrastructure();
  let createArgs = null;

  await createPayrollCashEntry(
    {
      payrollCashEntry: {
        create: async (args) => {
          createArgs = args;
          return { id: "cash_1" };
        },
      },
    },
    {
      organizationId: "org_1",
      amount: 150000,
      paymentMethod: "CASH",
      externalRef: " ref-1 ",
      note: " payroll payout ",
    },
  );

  assert.equal(createArgs.data.organizationId, "org_1");
  assert.equal(createArgs.data.entryType, "PAYROLL_PAYOUT");
  assert.equal(createArgs.data.externalRef, "ref-1");
  assert.equal(createArgs.data.note, "payroll payout");
  assert.ok(createArgs.data.occurredAt instanceof Date);
});

test("mapPayrollEmployeeConfigRow nested employee payloadni normalize qiladi", () => {
  const { mapPayrollEmployeeConfigRow } = createInfrastructure();

  const result = mapPayrollEmployeeConfigRow({
    id: "emp_1",
    organizationId: "org_1",
    userId: "user_1",
    kind: "TEACHER",
    payrollMode: "MIXED",
    employmentStatus: "ACTIVE",
    isPayrollEligible: 1,
    fixedSalaryAmount: 2500000,
    note: "",
    firstName: "Ali",
    lastName: "Valiyev",
    hireDate: "2026-01-01",
    terminationDate: null,
    user: {
      id: "user_1",
      username: "ali",
      role: "TEACHER",
      isActive: 1,
    },
    teacher: {
      id: "teacher_1",
      firstName: "Ali",
      lastName: "Valiyev",
      subject: "Math",
    },
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-02T00:00:00.000Z",
  });

  assert.equal(result.isPayrollEligible, true);
  assert.equal(result.note, null);
  assert.equal(result.user.username, "ali");
  assert.equal(result.teacher.subject, "Math");
});
