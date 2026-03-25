const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");

const { ApiError } = require("../src/utils/apiError");
const { createPayrollLessonRateDomain } = require("../src/services/payroll/shared/payrollLessonRateDomain");

function decimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function money(value) {
  return decimal(value).toDecimalPlaces(2);
}

function createDomain() {
  return createPayrollLessonRateDomain({
    ApiError,
    decimal,
    money,
  });
}

test("isEmployeeLessonPayrollEligible faqat ACTIVE + eligible + LESSON_BASED/MIXED uchun true", () => {
  const { isEmployeeLessonPayrollEligible } = createDomain();

  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "LESSON_BASED",
    }),
    true,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "MIXED",
    }),
    true,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: false,
      employmentStatus: "ACTIVE",
      payrollMode: "LESSON_BASED",
    }),
    false,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ARCHIVED",
      payrollMode: "LESSON_BASED",
    }),
    false,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "MANUAL_ONLY",
    }),
    false,
  );
});

test("resolvePayrollTeacherIdForLesson REPLACED lesson uchun replacement teacher talab qiladi", () => {
  const { resolvePayrollTeacherIdForLesson } = createDomain();

  assert.equal(
    resolvePayrollTeacherIdForLesson({
      id: "lesson_1",
      status: "DONE",
      teacherId: "teacher_1",
    }),
    "teacher_1",
  );

  assert.throws(
    () =>
      resolvePayrollTeacherIdForLesson({
        id: "lesson_2",
        status: "REPLACED",
        teacherId: "teacher_1",
        replacedByTeacherId: null,
      }),
    (error) => {
      assert.equal(error.code, "REAL_LESSON_REPLACED_TEACHER_REQUIRED");
      return true;
    },
  );
});

test("resolveRateForLesson teacher rate ni subject defaultdan ustun qo'yadi", () => {
  const { resolveRateForLesson } = createDomain();

  const teacherRateMap = new Map([
    [
      "teacher_1:subject_1",
      [
        {
          id: "teacher_rate_1",
          ratePerHour: new Prisma.Decimal(70000),
          effectiveFrom: "2026-03-01T00:00:00.000Z",
          effectiveTo: null,
        },
      ],
    ],
  ]);
  const subjectDefaultRateMap = new Map([
    [
      "subject_1",
      [
        {
          id: "subject_rate_1",
          ratePerHour: new Prisma.Decimal(50000),
          effectiveFrom: "2026-03-01T00:00:00.000Z",
          effectiveTo: null,
        },
      ],
    ],
  ]);

  const resolved = resolveRateForLesson({
    lesson: {
      teacherId: "teacher_1",
      subjectId: "subject_1",
      startAt: "2026-03-15T08:00:00.000Z",
    },
    teacherRateMap,
    subjectDefaultRateMap,
  });

  assert.equal(resolved.rateSource, "TEACHER_RATE");
  assert.equal(resolved.teacherRateId, "teacher_rate_1");
  assert.equal(String(resolved.ratePerHour), "70000");
});

test("loadRatesForPeriod replaced teacherlarni ham preload qilib maplarga guruhlaydi", async () => {
  const { loadRatesForPeriod, calcLessonAmount } = createDomain();
  let teacherWhere = null;
  let subjectWhere = null;

  const result = await loadRatesForPeriod(
    {
      teacherRate: {
        findMany: async ({ where }) => {
          teacherWhere = where;
          return [
            {
              id: "teacher_rate_1",
              teacherId: "teacher_1",
              subjectId: "subject_1",
              ratePerHour: new Prisma.Decimal(60000),
              effectiveFrom: "2026-03-01T00:00:00.000Z",
              effectiveTo: null,
            },
            {
              id: "teacher_rate_2",
              teacherId: "teacher_2",
              subjectId: "subject_1",
              ratePerHour: new Prisma.Decimal(80000),
              effectiveFrom: "2026-03-01T00:00:00.000Z",
              effectiveTo: null,
            },
          ];
        },
      },
      subjectDefaultRate: {
        findMany: async ({ where }) => {
          subjectWhere = where;
          return [
            {
              id: "subject_rate_1",
              subjectId: "subject_1",
              ratePerHour: new Prisma.Decimal(50000),
              effectiveFrom: "2026-03-01T00:00:00.000Z",
              effectiveTo: null,
            },
          ];
        },
      },
    },
    {
      organizationId: "org_1",
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
      lessons: [
        {
          teacherId: "teacher_1",
          replacedByTeacherId: "teacher_2",
          subjectId: "subject_1",
        },
      ],
    },
  );

  assert.deepEqual(teacherWhere.teacherId.in, ["teacher_1", "teacher_2"]);
  assert.deepEqual(subjectWhere.subjectId.in, ["subject_1"]);
  assert.equal(result.teacherMap.get("teacher_2:subject_1")[0].id, "teacher_rate_2");
  assert.equal(result.subjectMap.get("subject_1")[0].id, "subject_rate_1");
  assert.equal(String(calcLessonAmount(new Prisma.Decimal(60000), 90)), "90000");
});
