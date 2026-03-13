const test = require("node:test");
const assert = require("node:assert/strict");
const {
  syncStudentOyMajburiyatlar,
  summarizeDebtFromMajburiyatRows,
} = require("../src/services/financeMajburiyatService");

test("summarizeDebtFromMajburiyatRows calculates debt and paid counts", () => {
  const result = summarizeDebtFromMajburiyatRows([
    { yil: 2026, oy: 1, netSumma: 300000, holat: "TOLANGAN" },
    { yil: 2026, oy: 2, netSumma: 300000, holat: "BELGILANDI" },
    { yil: 2026, oy: 3, netSumma: 0, holat: "TOLANGAN" },
  ]);

  assert.equal(result.qarzOylarSoni, 1);
  assert.equal(result.tolanganOylarSoni, 2);
  assert.equal(result.jamiQarzSumma, 300000);
  assert.equal(result.holat, "QARZDOR");
  assert.deepEqual(
    result.qarzOylar.map((m) => m.key),
    ["2026-02"],
  );
});

test("syncStudentOyMajburiyatlar applies incremental create/update/delete diff", async () => {
  const calls = {
    findMany: [],
    deleteMany: [],
    createMany: [],
    update: [],
  };

  const prismaClient = {
    student: {
      findMany: async () => [
        {
          id: "student-1",
          createdAt: new Date("2025-09-01T00:00:00.000Z"),
          enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
        },
      ],
    },
    tolovQoplama: {
      findMany: async () => [],
    },
    tolovImtiyozi: {
      findMany: async () => [],
    },
    studentOyMajburiyat: {
      findMany: async (args) => {
        calls.findMany.push(args);
        return [
          {
            id: "existing-current",
            studentId: "student-1",
            yil: 2026,
            oy: 3,
            bazaSumma: 300000,
            imtiyozSumma: 0,
            netSumma: 300000,
            tolanganSumma: 0,
            qoldiqSumma: 0,
            holat: "TOLANGAN",
            source: "BAZA",
          },
          {
            id: "stale-row",
            studentId: "student-1",
            yil: 2024,
            oy: 1,
            bazaSumma: 300000,
            imtiyozSumma: 0,
            netSumma: 300000,
            tolanganSumma: 0,
            qoldiqSumma: 300000,
            holat: "BELGILANDI",
            source: "BAZA",
          },
        ];
      },
      deleteMany: async (args) => {
        calls.deleteMany.push(args);
        return { count: 0 };
      },
      createMany: async (args) => {
        calls.createMany.push(args);
        return { count: Array.isArray(args.data) ? args.data.length : 0 };
      },
      update: async (args) => {
        calls.update.push(args);
        return args;
      },
    },
  };

  const result = await syncStudentOyMajburiyatlar({
    prismaClient,
    studentIds: ["student-1"],
    oylikSumma: 300000,
    futureMonths: 0,
    chargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
  });

  assert.equal(calls.findMany.length, 1);
  assert.equal(calls.deleteMany.length, 1);
  assert.equal(calls.createMany.length, 1);
  assert.equal(calls.update.length, 1);
  assert.ok(calls.deleteMany[0].where.id.in.includes("stale-row"));
  assert.ok(calls.createMany[0].data.length > 0);
  assert.equal(calls.createMany[0].skipDuplicates, true);
  assert.deepEqual(calls.update[0].where, {
    studentId_yil_oy: {
      studentId: "student-1",
      yil: 2026,
      oy: 3,
    },
  });
  assert.equal(result.deletedCount, 1);
  assert.equal(result.updatedCount, 1);
  assert.ok(result.createdCount > 0);
});

test("syncStudentOyMajburiyatlar skips writes when rows are unchanged", async () => {
  const storedRows = [];
  const createCalls = [];
  const updateCalls = [];
  const deleteCalls = [];

  const prismaClient = {
    student: {
      findMany: async () => [
        {
          id: "student-1",
          createdAt: new Date("2025-09-01T00:00:00.000Z"),
          enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
        },
      ],
    },
    tolovQoplama: {
      findMany: async () => [],
    },
    tolovImtiyozi: {
      findMany: async () => [],
    },
    studentOyMajburiyat: {
      findMany: async () => storedRows.map((row, index) => ({ id: `row-${index + 1}`, ...row })),
      deleteMany: async (args) => {
        deleteCalls.push(args);
        return { count: 0 };
      },
      createMany: async (args) => {
        createCalls.push(args);
        storedRows.push(...args.data);
        return { count: Array.isArray(args.data) ? args.data.length : 0 };
      },
      update: async (args) => {
        updateCalls.push(args);
        return args;
      },
    },
  };

  await syncStudentOyMajburiyatlar({
    prismaClient,
    studentIds: ["student-1"],
    oylikSumma: 300000,
    futureMonths: 0,
    chargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
  });

  createCalls.length = 0;

  const result = await syncStudentOyMajburiyatlar({
    prismaClient,
    studentIds: ["student-1"],
    oylikSumma: 300000,
    futureMonths: 0,
    chargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
  });

  assert.equal(createCalls.length, 0);
  assert.equal(updateCalls.length, 0);
  assert.equal(deleteCalls.length, 0);
  assert.equal(result.createdCount, 0);
  assert.equal(result.updatedCount, 0);
  assert.equal(result.deletedCount, 0);
  assert.ok(result.unchangedCount > 0);
});
