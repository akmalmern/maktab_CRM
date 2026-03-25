const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeSaveTeacherAttendanceSession,
} = require("../src/services/attendance/useCases/saveTeacherAttendanceSession");

test("executeSaveTeacherAttendanceSession payroll refresh lock bo'lsa skip reason qaytaradi", async () => {
  const auditRows = [];

  const deps = {
    ApiError,
    parseSanaOrToday: (sanaStr) => ({ sana: new Date(`${sanaStr}T00:00:00.000Z`) }),
    localTodayIsoDate: () => "2026-03-10",
    getTeacherAttendanceScopeByUserId: async () => ({ id: "teacher_1" }),
    ensureDateMatchesLessonDay: () => {},
    createDarsDateTimeUTC: () => null,
    buildRealLessonTiming: () => ({
      startAt: new Date("2026-03-10T03:00:00.000Z"),
      endAt: new Date("2026-03-10T04:00:00.000Z"),
      durationMinutes: 60,
    }),
    ensureMainOrganization: async () => ({ id: "org_1" }),
    refreshDraftPayrollForLesson: async () => {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", "locked");
    },
    prisma: {
      darsJadvali: {
        findFirst: async () => ({
          id: "dars_1",
          sinfId: "class_1",
          fanId: "subject_1",
          oqituvchiId: "teacher_1",
          haftaKuni: "SESHANBA",
          vaqtOraliq: { boshlanishVaqti: "08:00", tugashVaqti: "09:00" },
        }),
      },
      enrollment: {
        findMany: async () => [{ studentId: "student_1" }],
      },
      $transaction: async (callback) =>
        callback({
          davomat: {
            findMany: async () => [],
            createMany: async () => ({ count: 1 }),
            update: async () => null,
          },
          baho: {
            findMany: async () => [],
            createMany: async () => ({ count: 0 }),
            deleteMany: async () => ({ count: 0 }),
            update: async () => null,
          },
          realLesson: {
            findFirst: async () => ({
              id: "lesson_1",
              payrollLines: [{ id: "line_1" }],
            }),
            create: async () => {
              throw new Error("should not create lesson");
            },
            update: async () => {
              throw new Error("should not update locked lesson");
            },
          },
          auditLog: {
            create: async ({ data }) => {
              auditRows.push(data);
              return { id: "audit_1" };
            },
          },
        }),
    },
  };

  const result = await executeSaveTeacherAttendanceSession({
    deps,
    userId: "user_teacher_1",
    darsId: "dars_1",
    body: {
      sana: "2026-03-10",
      davomatlar: [{ studentId: "student_1", holat: "KELDI" }],
    },
  });

  assert.equal(result.sana, "2026-03-10");
  assert.equal(result.count, 1);
  assert.deepEqual(result.payrollAutoRun, {
    refreshed: false,
    skipped: true,
    reason: "PAYROLL_RUN_LOCKED",
  });
  assert.equal(auditRows.length, 1);
  assert.equal(auditRows[0].after.payrollLockedLesson, true);
});
