const test = require("node:test");
const assert = require("node:assert/strict");

const {
  executeGetTeacherAttendanceHistoryByUserId,
} = require("../src/services/attendance/useCases/queryTeacherAttendanceHistory");
const {
  executeGetStudentAttendanceByUserId,
} = require("../src/services/attendance/useCases/queryStudentAttendance");

function createCommonDeps() {
  return {
    parseSanaOrToday: (value) => ({
      sana: new Date(`${value || "2026-03-10"}T00:00:00.000Z`),
      sanaStr: value || "2026-03-10",
    }),
    buildRangeByType: () => ({
      type: "OYLIK",
      from: new Date("2026-03-01T00:00:00.000Z"),
      to: new Date("2026-04-01T00:00:00.000Z"),
    }),
    parseIntSafe: (value, fallback) => {
      const parsed = Number.parseInt(String(value ?? ""), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    },
    toIsoDate: (value) => new Date(value).toISOString().slice(0, 10),
  };
}

test("executeGetTeacherAttendanceHistoryByUserId empty sessiya uchun bo'sh payload qaytaradi", async () => {
  const result = await executeGetTeacherAttendanceHistoryByUserId({
    deps: {
      ...createCommonDeps(),
      getTeacherAttendanceScopeByUserId: async () => ({ id: "teacher_1" }),
      prisma: {
        davomat: {
          groupBy: async () => [],
          count: async () => 0,
        },
        $transaction: async (items) => Promise.all(items),
      },
    },
    userId: "user_teacher_1",
    query: {
      sana: "2026-03-10",
      periodType: "OYLIK",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.total, 0);
  assert.deepEqual(result.tarix, []);
  assert.equal(result.jami.darsSessiyalari, 0);
});

test("executeGetStudentAttendanceByUserId JORIY bahoni primary baho sifatida qaytaradi", async () => {
  const recordDate = new Date("2026-03-10T00:00:00.000Z");
  const result = await executeGetStudentAttendanceByUserId({
    deps: {
      ...createCommonDeps(),
      normalizeHolatCounts: () => ({
        KELDI: 1,
        KECHIKDI: 0,
        SABABLI: 0,
        SABABSIZ: 0,
      }),
      calcFoizFromCounts: () => 100,
      getStudentAttendanceScopeByUserId: async () => ({
        id: "student_1",
        firstName: "Ali",
        lastName: "Valiyev",
        enrollments: [
          {
            classroom: {
              name: "7-A",
              academicYear: "2025-2026",
            },
          },
        ],
      }),
      prisma: {
        davomat: {
          count: async () => 1,
          findMany: async () => [
            {
              id: "dav_1",
              darsJadvaliId: "dars_1",
              sana: recordDate,
              holat: "KELDI",
              darsJadvali: {
                fan: { name: "Math" },
                sinf: { name: "7-A", academicYear: "2025-2026" },
                vaqtOraliq: { nomi: "1-juftlik", boshlanishVaqti: "08:00" },
                oqituvchi: { firstName: "Ali", lastName: "Karimov" },
              },
            },
          ],
          groupBy: async () => [{ holat: "KELDI", _count: { _all: 1 } }],
        },
        baho: {
          findMany: async () => [
            {
              darsJadvaliId: "dars_1",
              sana: recordDate,
              turi: "YAKUNIY",
              ball: 4,
              maxBall: 5,
            },
            {
              darsJadvaliId: "dars_1",
              sana: recordDate,
              turi: "JORIY",
              ball: 5,
              maxBall: 5,
            },
          ],
        },
        $transaction: async (items) => Promise.all(items),
      },
    },
    userId: "user_student_1",
    query: {
      sana: "2026-03-10",
      periodType: "OYLIK",
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.equal(result.tarix[0].bahoBall, 5);
  assert.equal(result.tarix[0].bahoTuri, "JORIY");
  assert.equal(result.statistika.foiz, 100);
});
