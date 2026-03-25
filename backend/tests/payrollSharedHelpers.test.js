const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  monthKeyFromDateValue,
  monthKeyToUtcRange,
  computeDurationMinutes,
  normalizeRequestedPeriodMonth,
  parseBooleanFlag,
} = require("../src/services/payroll/shared/payrollPeriodUtils");
const {
  executeRefreshDraftPayrollForLessonsSafe,
} = require("../src/services/payroll/shared/payrollRefreshOrchestrator");

test("payroll period utils normalize month and parse boolean flags", () => {
  assert.equal(normalizeRequestedPeriodMonth(" 2026-03 "), "2026-03");
  assert.equal(parseBooleanFlag("false", true), false);
  assert.equal(parseBooleanFlag("1", false), true);
  assert.equal(monthKeyFromDateValue("2026-03-10T12:00:00.000Z"), "2026-03");
  assert.equal(monthKeyToUtcRange("2026-03").periodMonth, "2026-03");
});

test("computeDurationMinutes uses provided value or derives from start/end", () => {
  assert.equal(computeDurationMinutes(null, null, 95), 95);
  assert.equal(
    computeDurationMinutes("2026-03-10T08:00:00.000Z", "2026-03-10T09:15:00.000Z"),
    75,
  );
  assert.throws(
    () => computeDurationMinutes("2026-03-10T09:15:00.000Z", "2026-03-10T08:00:00.000Z"),
    (error) => {
      assert.equal(error.code, "INVALID_LESSON_DURATION");
      return true;
    },
  );
});

test("executeRefreshDraftPayrollForLessonsSafe aggregates refreshed and skipped lessons", async () => {
  const errorLogs = [];

  const result = await executeRefreshDraftPayrollForLessonsSafe({
    lessonIds: ["lesson_1", "lesson_2", "lesson_3", "lesson_1"],
    actorUserId: "user_1",
    req: {},
    ApiError,
    refreshDraftPayrollForLesson: async ({ lessonId }) => {
      if (lessonId === "lesson_1") return { runId: "run_1" };
      if (lessonId === "lesson_2") {
        throw new ApiError(409, "PAYROLL_RATE_NOT_FOUND", "rate missing");
      }
      throw new Error("boom");
    },
    logError: (...args) => {
      errorLogs.push(args);
    },
  });

  assert.deepEqual(result, {
    attemptedCount: 3,
    refreshedCount: 1,
    skippedCount: 2,
    skippedByReason: {
      PAYROLL_RATE_NOT_FOUND: 1,
      UNKNOWN_ERROR: 1,
    },
    details: [
      {
        lessonId: "lesson_1",
        refreshed: true,
        skipped: false,
        reason: null,
        runId: "run_1",
      },
      {
        lessonId: "lesson_2",
        refreshed: false,
        skipped: true,
        reason: "PAYROLL_RATE_NOT_FOUND",
      },
      {
        lessonId: "lesson_3",
        refreshed: false,
        skipped: true,
        reason: "UNKNOWN_ERROR",
      },
    ],
  });
  assert.equal(errorLogs.length, 1);
});
