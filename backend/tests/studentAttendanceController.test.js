const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const { getMyAttendance } = require("../src/controllers/student/attendanceController");

async function runWithStubs(stubs, fn) {
  const restores = stubs.map(({ obj, key, value }) => {
    const previous = obj[key];
    obj[key] = value;
    return () => {
      obj[key] = previous;
    };
  });

  try {
    return await fn();
  } finally {
    for (const restore of restores.reverse()) restore();
  }
}

test(
  "getMyAttendance paginates history and keeps full-period statistics",
  { concurrency: false },
  async () => {
    let payload = null;
    const rowDate = new Date("2026-02-18T00:00:00.000Z");

    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findUnique",
          value: async () => ({
            id: "student1",
            firstName: "Akmal",
            lastName: "Tursunov",
            enrollments: [
              {
                classroom: { id: "class1", name: "10-A", academicYear: "2025-2026" },
              },
            ],
          }),
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async () => [
            5,
            [
              {
                id: "dav1",
                darsJadvaliId: "dars1",
                sana: rowDate,
                holat: "KELDI",
                izoh: "",
                darsJadvali: {
                  fan: { name: "Algebra" },
                  sinf: { name: "10-A", academicYear: "2025-2026" },
                  vaqtOraliq: { nomi: "1-para", boshlanishVaqti: "08:30" },
                  oqituvchi: { firstName: "Oybek", lastName: "Raxmonov" },
                },
              },
            ],
            [
              { holat: "KELDI", _count: { _all: 2 } },
              { holat: "KECHIKDI", _count: { _all: 1 } },
              { holat: "SABABSIZ", _count: { _all: 2 } },
            ],
          ],
        },
        {
          obj: prisma.baho,
          key: "findMany",
          value: async () => [
            {
              darsJadvaliId: "dars1",
              sana: rowDate,
              turi: "JORIY",
              ball: 4,
              maxBall: 5,
              izoh: "Yaxshi",
            },
          ],
        },
      ],
      async () => {
        await getMyAttendance(
          {
            user: { sub: "user1" },
            query: { sana: "2026-02-20", periodType: "OYLIK", page: "2", limit: "1" },
          },
          {
            json: (value) => {
              payload = value;
              return value;
            },
          },
        );
      },
    );

    assert.equal(payload?.ok, true);
    assert.equal(payload?.page, 2);
    assert.equal(payload?.limit, 1);
    assert.equal(payload?.total, 5);
    assert.equal(payload?.pages, 5);
    assert.equal(payload?.statistika?.jami, 5);
    assert.equal(payload?.statistika?.foiz, 60);
    assert.equal(payload?.tarix?.length, 1);
    assert.equal(payload?.tarix?.[0]?.bahoBall, 4);
  },
);
