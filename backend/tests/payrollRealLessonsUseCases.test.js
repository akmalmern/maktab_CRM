const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeCreateRealLesson,
  executeUpdateRealLessonStatus,
  executeBulkUpdateRealLessonStatus,
} = require("../src/services/payroll/useCases/manageRealLessons");

function cleanOptional(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

test("executeCreateRealLesson computes duration and refreshes draft payroll", async () => {
  let createdPayload = null;
  let computeArgs = null;
  let refreshPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          realLesson: {
            findFirst: async () => null,
            create: async ({ data }) => {
              createdPayload = data;
              return { id: "lesson_1", ...data };
            },
          },
        }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    assertTeacherExists: async () => {},
    assertSubjectExists: async () => {},
    assertClassroomExists: async () => {},
    assertDarsJadvaliExists: async () => null,
    computeDurationMinutes: (startAt, endAt, durationMinutes) => {
      computeArgs = { startAt, endAt, durationMinutes };
      return 95;
    },
    cleanOptional,
    createAuditLog: async () => {},
    refreshDraftPayrollForLessonsSafe: async (payload) => {
      refreshPayload = payload;
      return { refreshedCount: 1 };
    },
  };

  const result = await executeCreateRealLesson({
    deps,
    body: {
      teacherId: "teacher_1",
      subjectId: "subject_1",
      classroomId: "classroom_1",
      startAt: "2026-03-17T08:00:00.000Z",
      endAt: "2026-03-17T09:35:00.000Z",
      note: "  Open lesson  ",
    },
    actorUserId: "user_1",
    req: {},
  });

  assert.deepEqual(computeArgs, {
    startAt: "2026-03-17T08:00:00.000Z",
    endAt: "2026-03-17T09:35:00.000Z",
    durationMinutes: undefined,
  });
  assert.equal(createdPayload.organizationId, "org_1");
  assert.equal(createdPayload.durationMinutes, 95);
  assert.equal(createdPayload.status, "DONE");
  assert.equal(createdPayload.note, "Open lesson");
  assert.deepEqual(refreshPayload, {
    lessonIds: ["lesson_1"],
    actorUserId: "user_1",
    req: {},
  });
  assert.equal(result.lesson.id, "lesson_1");
  assert.equal(result.payrollAutoRun.refreshedCount, 1);
});

test("executeUpdateRealLessonStatus rejects lessons already locked by payroll", async () => {
  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          realLesson: {
            findFirst: async () => ({
              id: "lesson_1",
              teacherId: "teacher_1",
              status: "DONE",
              note: null,
              replacedByTeacherId: null,
              payrollLines: [{ id: "line_1" }],
            }),
          },
        }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    assertTeacherExists: async () => {},
    cleanOptional,
    createAuditLog: async () => {},
    refreshDraftPayrollForLessonsSafe: async () => ({ refreshedCount: 0 }),
  };

  await assert.rejects(
    executeUpdateRealLessonStatus({
      deps,
      lessonId: "lesson_1",
      body: { status: "ABSENT" },
      actorUserId: "user_1",
      req: {},
    }),
    (error) => {
      assert.equal(error.code, "REAL_LESSON_LOCKED_BY_PAYROLL");
      return true;
    },
  );
});

test("executeBulkUpdateRealLessonStatus refreshes only updated lessons and reports skipped rows", async () => {
  const updatedIds = [];
  let refreshPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          realLesson: {
            findMany: async () => [
              {
                id: "lesson_1",
                teacherId: "teacher_1",
                status: "DONE",
                note: null,
                replacedByTeacherId: null,
                payrollLines: [],
              },
              {
                id: "lesson_2",
                teacherId: "teacher_2",
                status: "DONE",
                note: null,
                replacedByTeacherId: null,
                payrollLines: [{ id: "line_1" }],
              },
            ],
            update: async ({ where, data, select }) => {
              updatedIds.push(where.id);
              return {
                id: select.id ? where.id : undefined,
                status: select.status ? data.status : undefined,
                note: select.note ? data.note : undefined,
                replacedByTeacherId: select.replacedByTeacherId ? data.replacedByTeacherId : undefined,
              };
            },
          },
        }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    assertTeacherExists: async () => {},
    cleanOptional,
    createAuditLog: async () => {},
    refreshDraftPayrollForLessonsSafe: async (payload) => {
      refreshPayload = payload;
      return { refreshedCount: payload.lessonIds.length };
    },
  };

  const result = await executeBulkUpdateRealLessonStatus({
    deps,
    body: {
      lessonIds: ["lesson_1", "lesson_2", "lesson_3", "lesson_1"],
      status: "REPLACED",
      replacedByTeacherId: "teacher_9",
      note: "  Substitution  ",
    },
    actorUserId: "user_1",
    req: {},
  });

  assert.deepEqual(updatedIds, ["lesson_1"]);
  assert.deepEqual(result.summary, {
    selectedCount: 3,
    updatedCount: 1,
    skippedCount: 2,
  });
  assert.deepEqual(result.updatedLessonIds, ["lesson_1"]);
  assert.deepEqual(
    result.skipped.map((row) => row.code).sort(),
    ["REAL_LESSON_LOCKED_BY_PAYROLL", "REAL_LESSON_NOT_FOUND"],
  );
  assert.deepEqual(refreshPayload, {
    lessonIds: ["lesson_1"],
    actorUserId: "user_1",
    req: {},
  });
  assert.equal(result.payrollAutoRun.refreshedCount, 1);
});
