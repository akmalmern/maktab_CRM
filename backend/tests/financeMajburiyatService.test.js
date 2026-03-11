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

test("syncStudentOyMajburiyatlar uses bulk delete/create for due months", async () => {
  const calls = {
    deleteMany: [],
    createMany: [],
    upsert: 0,
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
      deleteMany: async (args) => {
        calls.deleteMany.push(args);
        return { count: 0 };
      },
      createMany: async (args) => {
        calls.createMany.push(args);
        return { count: Array.isArray(args.data) ? args.data.length : 0 };
      },
      upsert: async () => {
        calls.upsert += 1;
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

  assert.equal(calls.upsert, 0);
  assert.equal(calls.deleteMany.length, 1);
  assert.equal(calls.createMany.length, 1);
  assert.ok(calls.createMany[0].data.length > 0);
  assert.equal(calls.createMany[0].skipDuplicates, true);
});
