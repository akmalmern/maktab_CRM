const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const {
  getCurrentAcademicYear,
  isSeptemberInTashkent,
  parseClassName,
  buildAnnualPromotionPlan,
  applyAnnualPromotion,
} = require("../src/services/classroomPromotionService");

async function runWithStubs(stubs, fn) {
  const restores = stubs.map(({ obj, key, value }) => {
    const prev = obj[key];
    obj[key] = value;
    return () => {
      obj[key] = prev;
    };
  });

  try {
    return await fn();
  } finally {
    for (const restore of restores.reverse()) restore();
  }
}

test(
  "getCurrentAcademicYear uses Tashkent timezone at September boundary",
  { concurrency: false },
  async () => {
    const utcLateAugust = new Date("2026-08-31T23:30:00.000Z"); // Tashkent: 2026-09-01 04:30
    assert.equal(getCurrentAcademicYear(utcLateAugust), "2026-2027");
    assert.equal(isSeptemberInTashkent(utcLateAugust), true);
  },
);

test("parseClassName supports long suffix and preserves suffix text", () => {
  const parsed = parseClassName("10-FizMat");
  assert.deepEqual(parsed, { grade: 10, suffix: "FizMat" });
});

test(
  "buildAnnualPromotionPlan counts only active enrollments",
  { concurrency: false },
  async () => {
    let classroomFindManyCall = 0;
    const plan = await runWithStubs(
      [
        {
          obj: prisma.classroom,
          key: "findMany",
          value: async () => {
            classroomFindManyCall += 1;
            if (classroomFindManyCall === 1) {
              return [
                { id: "c10a", name: "10-A", academicYear: "2025-2026" },
                { id: "c11a", name: "11-A", academicYear: "2025-2026" },
              ];
            }
            return [];
          },
        },
        {
          obj: prisma.enrollment,
          key: "groupBy",
          value: async () => [
            { classroomId: "c10a", _count: { _all: 2 } },
            { classroomId: "c11a", _count: { _all: 1 } },
          ],
        },
      ],
      async () => buildAnnualPromotionPlan(new Date("2026-10-05T00:00:00.000Z")),
    );

    assert.equal(plan.sourceAcademicYear, "2025-2026");
    assert.equal(plan.targetAcademicYear, "2026-2027");
    assert.equal(plan.promoteItems.length, 1);
    assert.equal(plan.promoteItems[0].sourceName, "10-A");
    assert.equal(plan.promoteItems[0].studentCount, 2);
    assert.equal(plan.graduateItems.length, 1);
    assert.equal(plan.graduateItems[0].sourceName, "11-A");
    assert.equal(plan.graduateItems[0].studentCount, 1);
  },
);

test(
  "buildAnnualPromotionPlan promotes classroom with long suffix name",
  { concurrency: false },
  async () => {
    let classroomFindManyCall = 0;
    const plan = await runWithStubs(
      [
        {
          obj: prisma.classroom,
          key: "findMany",
          value: async () => {
            classroomFindManyCall += 1;
            if (classroomFindManyCall === 1) {
              return [{ id: "c10fm", name: "10-FizMat", academicYear: "2025-2026" }];
            }
            return [];
          },
        },
        {
          obj: prisma.enrollment,
          key: "groupBy",
          value: async () => [{ classroomId: "c10fm", _count: { _all: 3 } }],
        },
      ],
      async () => buildAnnualPromotionPlan(new Date("2026-10-05T00:00:00.000Z")),
    );

    assert.equal(plan.skippedItems.length, 0);
    assert.equal(plan.promoteItems.length, 1);
    assert.equal(plan.promoteItems[0].targetName, "11-FizMat");
    assert.equal(plan.promoteItems[0].studentCount, 3);
  },
);

test(
  "applyAnnualPromotion handles target classroom create race (P2002) by refetching",
  { concurrency: false },
  async () => {
    let classroomFindManyCall = 0;
    const classroomUpdates = [];
    const enrollmentCreates = [];

    const result = await runWithStubs(
      [
        {
          obj: prisma.classroom,
          key: "findMany",
          value: async () => {
            classroomFindManyCall += 1;
            if (classroomFindManyCall === 1) {
              return [{ id: "c9a", name: "9-A", academicYear: "2025-2026" }];
            }
            return [];
          },
        },
        {
          obj: prisma.enrollment,
          key: "groupBy",
          value: async () => [{ classroomId: "c9a", _count: { _all: 1 } }],
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async (callback) =>
            callback({
              classroom: {
                findUnique: async () => null,
                findFirst: async () => ({ id: "c10aRaced", isArchived: false }),
                create: async () => {
                  const err = new Error("unique");
                  err.code = "P2002";
                  err.meta = { target: ["name", "academicYear"] };
                  throw err;
                },
                update: async (payload) => {
                  classroomUpdates.push(payload);
                  return payload;
                },
                updateMany: async () => ({ count: 0 }),
              },
              enrollment: {
                findMany: async () => [{ id: "e1", studentId: "s1" }],
                updateMany: async () => ({ count: 1 }),
                createMany: async (payload) => {
                  enrollmentCreates.push(payload);
                  return { count: payload.data.length };
                },
              },
              moliyaTarifAudit: { create: async () => ({}) },
            }),
        },
      ],
      async () =>
        applyAnnualPromotion({
          referenceDate: new Date("2026-10-05T00:00:00.000Z"),
          force: true,
          actorUserId: null,
          mode: "manual",
        }),
    );

    assert.equal(result.skipped, false);
    assert.equal(result.applied.promoted, 1);
    assert.equal(enrollmentCreates.length, 1);
    assert.equal(enrollmentCreates[0].data[0].classroomId, "c10aRaced");
    assert.equal(
      classroomUpdates.some(
        (row) => row.where?.id === "c9a" && row.data?.isArchived === true,
      ),
      true,
    );
  },
);

test(
  "applyAnnualPromotion creates target classroom and moves active enrollments",
  { concurrency: false },
  async () => {
    let classroomFindManyCall = 0;
    const createdClassrooms = [];
    const classroomUpdates = [];
    const enrollmentUpdates = [];
    const enrollmentCreates = [];

    const result = await runWithStubs(
      [
        {
          obj: prisma.classroom,
          key: "findMany",
          value: async () => {
            classroomFindManyCall += 1;
            if (classroomFindManyCall === 1) {
              return [{ id: "c10a", name: "10-A", academicYear: "2025-2026" }];
            }
            return [];
          },
        },
        {
          obj: prisma.enrollment,
          key: "groupBy",
          value: async () => [{ classroomId: "c10a", _count: { _all: 2 } }],
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async (callback) =>
            callback({
              classroom: {
                findUnique: async () => null,
                create: async ({ data }) => {
                  createdClassrooms.push(data);
                  return { id: "c11a" };
                },
                update: async (payload) => {
                  classroomUpdates.push(payload);
                  return payload;
                },
                updateMany: async () => ({ count: 0 }),
              },
              enrollment: {
                findMany: async () => [
                  { id: "e1", studentId: "s1" },
                  { id: "e2", studentId: "s2" },
                ],
                updateMany: async (payload) => {
                  enrollmentUpdates.push(payload);
                  return { count: 2 };
                },
                createMany: async (payload) => {
                  enrollmentCreates.push(payload);
                  return { count: payload.data.length };
                },
              },
              moliyaTarifAudit: {
                create: async () => ({}),
              },
            }),
        },
      ],
      async () =>
        applyAnnualPromotion({
          referenceDate: new Date("2026-10-05T00:00:00.000Z"),
          force: true,
          actorUserId: null,
          mode: "manual",
        }),
    );

    assert.equal(result.skipped, false);
    assert.equal(result.applied.promoted, 1);
    assert.equal(createdClassrooms.length, 1);
    assert.equal(createdClassrooms[0].name, "11-A");
    assert.equal(createdClassrooms[0].academicYear, "2026-2027");

    assert.equal(enrollmentCreates.length, 1);
    assert.equal(enrollmentCreates[0].data.length, 2);
    assert.equal(enrollmentCreates[0].data[0].classroomId, "c11a");
    assert.equal(enrollmentCreates[0].skipDuplicates, true);

    assert.equal(enrollmentUpdates.length >= 2, true);
    assert.equal(
      classroomUpdates.some(
        (row) => row.where?.id === "c10a" && row.data?.isArchived === true,
      ),
      true,
    );
  },
);

test(
  "applyAnnualPromotion reuses archived target classroom by unarchiving it",
  { concurrency: false },
  async () => {
    let classroomFindManyCall = 0;
    const classroomUpdates = [];
    const classroomCreates = [];
    const enrollmentCreates = [];

    const result = await runWithStubs(
      [
        {
          obj: prisma.classroom,
          key: "findMany",
          value: async () => {
            classroomFindManyCall += 1;
            if (classroomFindManyCall === 1) {
              return [{ id: "c7a", name: "7-A", academicYear: "2025-2026" }];
            }
            return [
              {
                id: "c8aTarget",
                name: "8-A",
                academicYear: "2026-2027",
                isArchived: true,
              },
            ];
          },
        },
        {
          obj: prisma.enrollment,
          key: "groupBy",
          value: async () => [{ classroomId: "c7a", _count: { _all: 1 } }],
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async (callback) =>
            callback({
              classroom: {
                findUnique: async () => ({ id: "c8aTarget", isArchived: true }),
                create: async (payload) => {
                  classroomCreates.push(payload);
                  return { id: "newClassShouldNotBeCreated" };
                },
                update: async (payload) => {
                  classroomUpdates.push(payload);
                  return payload;
                },
                updateMany: async () => ({ count: 0 }),
              },
              enrollment: {
                findMany: async () => [{ id: "e1", studentId: "s1" }],
                updateMany: async () => ({ count: 1 }),
                createMany: async (payload) => {
                  enrollmentCreates.push(payload);
                  return { count: payload.data.length };
                },
              },
              moliyaTarifAudit: {
                create: async () => ({}),
              },
            }),
        },
      ],
      async () =>
        applyAnnualPromotion({
          referenceDate: new Date("2026-10-05T00:00:00.000Z"),
          force: true,
          actorUserId: null,
          mode: "manual",
        }),
    );

    assert.equal(result.skipped, false);
    assert.equal(result.applied.promoted, 1);
    assert.equal(classroomCreates.length, 0);
    assert.equal(
      classroomUpdates.some(
        (row) =>
          row.where?.id === "c8aTarget" && row.data?.isArchived === false,
      ),
      true,
    );
    assert.equal(
      classroomUpdates.some(
        (row) => row.where?.id === "c7a" && row.data?.isArchived === true,
      ),
      true,
    );
    assert.equal(enrollmentCreates.length, 1);
    assert.equal(enrollmentCreates[0].data[0].classroomId, "c8aTarget");
  },
);
