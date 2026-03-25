const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");

const {
  executeGetAdminAttendanceReportCore,
  executeGetAdminAttendanceReportData,
} = require("../src/services/attendance/useCases/queryAdminAttendanceReport");

const sessionDate = new Date("2026-03-02T00:00:00.000Z");
const nextDay = new Date("2026-03-03T00:00:00.000Z");

function createCommonDeps(overrides = {}) {
  return {
    Prisma,
    parseSanaOrToday: (value) => ({
      sana: new Date(`${value || "2026-03-02"}T00:00:00.000Z`),
      sanaStr: value || "2026-03-02",
    }),
    buildRangeByType: () => ({
      type: "KUNLIK",
      from: sessionDate,
      to: nextDay,
    }),
    buildAllRanges: () => ({
      kunlik: { type: "KUNLIK", from: sessionDate, to: nextDay },
      haftalik: { type: "HAFTALIK", from: sessionDate, to: nextDay },
      oylik: { type: "OYLIK", from: sessionDate, to: nextDay },
      choraklik: { type: "CHORAKLIK", from: sessionDate, to: nextDay },
      yillik: { type: "YILLIK", from: sessionDate, to: nextDay },
    }),
    utcDateToTashkentIsoDate: (value) => new Date(value).toISOString().slice(0, 10),
    toIsoDate: (value) => new Date(value).toISOString().slice(0, 10),
    normalizeHolatCounts: (rows = []) =>
      rows.reduce(
        (acc, row) => ({
          ...acc,
          [row.holat]: Number(row._count?._all || 0),
        }),
        { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 },
      ),
    calcFoizFromCounts: (total, counts) => {
      if (!total) return 0;
      const present = Number(counts.KELDI || 0) + Number(counts.KECHIKDI || 0);
      return Number(((present / total) * 100).toFixed(1));
    },
    ...overrides,
  };
}

test("executeGetAdminAttendanceReportCore empty holatda nol statistikani qaytaradi", async () => {
  const deps = createCommonDeps({
    prisma: {
      davomat: {
        groupBy: async () => [],
        count: async () => 0,
      },
      darsJadvali: {
        findMany: async () => [],
      },
      enrollment: {
        findFirst: async () => null,
        groupBy: async () => [],
      },
      student: {
        findMany: async () => [],
      },
      teacher: {
        findMany: async () => [],
      },
      $queryRaw: async () => [],
      $transaction: async (items) => Promise.all(items),
    },
  });

  const result = await executeGetAdminAttendanceReportCore({
    deps,
    query: { sana: "2026-03-02", periodType: "KUNLIK" },
  });

  assert.equal(result.selectedRecordsCount, 0);
  assert.deepEqual(result.tarix, []);
  assert.equal(result.foizlar.coverage, 0);
  assert.equal(result.foizlar.sessionCoverage, 0);
  assert.equal(result.expected.records, 0);
  assert.equal(result.expected.sessions, 0);
  assert.deepEqual(result.risk.topSababsizStudents, []);
  assert.deepEqual(result.risk.topSababsizTeachers, []);
  assert.deepEqual(result.risk.topSababsizClassrooms, []);
});

test("executeGetAdminAttendanceReportData tarix, coverage va riskni formatlab qaytaradi", async () => {
  const queryRawQueue = [
    [{ count: 1 }],
    [{ darsJadvaliId: "dars_1", sana: sessionDate, jami: 3 }],
    [{ id: "student_1", count: 2 }],
    [{ id: "teacher_1", count: 2 }],
    [{ id: "class_1", classroomName: "7-A", academicYear: "2025-2026", count: 2 }],
  ];

  const deps = createCommonDeps({
    prisma: {
      davomat: {
        groupBy: async (args) => {
          if (args.by?.length === 3) {
            return [
              {
                darsJadvaliId: "dars_1",
                sana: sessionDate,
                holat: "KELDI",
                _count: { _all: 2 },
              },
              {
                darsJadvaliId: "dars_1",
                sana: sessionDate,
                holat: "SABABSIZ",
                _count: { _all: 1 },
              },
            ];
          }
          return [
            { holat: "KELDI", _count: { _all: 2 } },
            { holat: "SABABSIZ", _count: { _all: 1 } },
          ];
        },
        count: async () => 3,
      },
      darsJadvali: {
        findMany: async (args) => {
          if (args.select?.sinfId) {
            return [{ sinfId: "class_1", haftaKuni: "DUSHANBA" }];
          }
          return [
            {
              id: "dars_1",
              sinf: { id: "class_1", name: "7-A", academicYear: "2025-2026" },
              fan: { name: "Math" },
              oqituvchi: { firstName: "Ali", lastName: "Karimov" },
            },
          ];
        },
      },
      enrollment: {
        findFirst: async () => null,
        groupBy: async () => [{ classroomId: "class_1", _count: { _all: 3 } }],
      },
      student: {
        findMany: async () => [
          {
            id: "student_1",
            firstName: "Vali",
            lastName: "Aliyev",
            user: { username: "vali" },
          },
        ],
      },
      teacher: {
        findMany: async () => [
          {
            id: "teacher_1",
            firstName: "Ali",
            lastName: "Karimov",
            user: { username: "akarimov" },
          },
        ],
      },
      $queryRaw: async () => queryRawQueue.shift() || [],
      $transaction: async (items) => Promise.all(items),
    },
  });

  const result = await executeGetAdminAttendanceReportData({
    deps,
    query: { sana: "2026-03-02", periodType: "KUNLIK", page: 1, limit: 20 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.periodType, "KUNLIK");
  assert.equal(result.total, 1);
  assert.equal(result.foizlar.coverage, 100);
  assert.equal(result.foizlar.sessionCoverage, 100);
  assert.equal(result.foizlar.tanlanganPeriodByExpected, 66.7);
  assert.equal(result.tarix[0].sinf, "7-A (2025-2026)");
  assert.equal(result.tarix[0].fan, "Math");
  assert.equal(result.tarix[0].holatlar.SABABSIZ, 1);
  assert.equal(result.jami.belgilanmaganYozuvlar, 0);
  assert.equal(result.risk.topSababsizStudents[0].fullName, "Vali Aliyev");
  assert.equal(result.risk.topSababsizTeachers[0].username, "akarimov");
  assert.equal(result.risk.topSababsizClassrooms[0].classroom, "7-A (2025-2026)");
});
