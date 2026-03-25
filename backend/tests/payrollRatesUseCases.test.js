const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeListTeacherRates,
  executeCreateSubjectDefaultRate,
  executeDeleteTeacherRate,
} = require("../src/services/payroll/useCases/managePayrollRates");

function decimalLike(value) {
  return {
    value: Number(value),
    toString() {
      return String(this.value);
    },
  };
}

test("executeListTeacherRates clamps page/limit and applies activeOn filter", async () => {
  let findManyArgs = null;
  let countArgs = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          teacherRate: {
            findMany: async (args) => {
              findManyArgs = args;
              return [{ id: "rate_1" }];
            },
            count: async (args) => {
              countArgs = args;
              return 1;
            },
          },
        }),
    },
    ensureMainOrganization: async () => ({ id: "org_1" }),
  };

  const result = await executeListTeacherRates({
    deps,
    query: {
      page: "0",
      limit: "500",
      teacherId: "teacher_1",
      subjectId: "subject_1",
      activeOn: "2026-03-15T00:00:00.000Z",
    },
  });

  assert.equal(result.page, 1);
  assert.equal(result.limit, 100);
  assert.equal(result.total, 1);
  assert.equal(findManyArgs.skip, 0);
  assert.equal(findManyArgs.take, 100);
  assert.deepEqual(findManyArgs.where, {
    organizationId: "org_1",
    teacherId: "teacher_1",
    subjectId: "subject_1",
    effectiveFrom: { lte: "2026-03-15T00:00:00.000Z" },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: "2026-03-15T00:00:00.000Z" } }],
  });
  assert.deepEqual(countArgs.where, findManyArgs.where);
});

test("executeDeleteTeacherRate rejects deleting rate already used in payroll lines", async () => {
  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          teacherRate: {
            findFirst: async () => ({
              id: "rate_1",
              teacherId: "teacher_1",
              subjectId: "subject_1",
              ratePerHour: decimalLike(50000),
              payrollLines: [{ id: "line_1" }],
            }),
          },
        }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    createAuditLog: async () => {},
  };

  await assert.rejects(
    executeDeleteTeacherRate({
      deps,
      rateId: "rate_1",
      actorUserId: "user_1",
      req: {},
    }),
    (error) => {
      assert.equal(error.code, "TEACHER_RATE_IN_USE");
      return true;
    },
  );
});

test("executeCreateSubjectDefaultRate validates overlap and persists normalized payload", async () => {
  let overlapPayload = null;
  let createPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          subjectDefaultRate: {
            create: async ({ data }) => {
              createPayload = data;
              return { id: "rate_1", ...data };
            },
          },
        }),
    },
    ensureMainOrganization: async () => ({ id: "org_1" }),
    assertSubjectExists: async () => {},
    money: decimalLike,
    cleanOptional: (value) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized || undefined;
    },
    assertNoSubjectDefaultRateOverlap: async (_tx, payload) => {
      overlapPayload = payload;
    },
    createAuditLog: async () => {},
  };

  const result = await executeCreateSubjectDefaultRate({
    deps,
    body: {
      subjectId: "subject_1",
      ratePerHour: 65000,
      effectiveFrom: "2026-03-01T00:00:00.000Z",
      effectiveTo: "",
      note: "  Default rate  ",
    },
    actorUserId: "user_1",
    req: {},
  });

  assert.equal(result.rate.id, "rate_1");
  assert.equal(String(overlapPayload.ratePerHour), "65000");
  assert.equal(overlapPayload.note, "Default rate");
  assert.equal(createPayload.organizationId, "org_1");
  assert.equal(createPayload.subjectId, "subject_1");
  assert.equal(String(createPayload.ratePerHour), "65000");
  assert.equal(createPayload.effectiveTo, null);
  assert.equal(createPayload.note, "Default rate");
  assert.equal(createPayload.createdByUserId, "user_1");
});
