const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const { getMyClassBaholar } = require("../src/controllers/student/gradeController");

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
  "getMyClassBaholar returns anonymized class statistics",
  { concurrency: false },
  async () => {
    let txCount = 0;
    let payload = null;

    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findUnique",
          value: async () => ({
            id: "student1",
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
          value: async () => {
            txCount += 1;
            if (txCount === 1) {
              return [
                [
                  {
                    sana: new Date("2026-02-18T00:00:00.000Z"),
                    turi: "JORIY",
                    darsJadvaliId: "dars1",
                    teacherId: "teacher1",
                    _count: { _all: 2 },
                    _avg: { ball: 8, maxBall: 10 },
                    _min: { ball: 7 },
                    _max: { ball: 9 },
                  },
                ],
                [
                  { turi: "JORIY", ball: 8, maxBall: 10 },
                  { turi: "JORIY", ball: 9, maxBall: 10 },
                ],
              ];
            }

            if (txCount === 2) {
              return [
                [
                  {
                    id: "dars1",
                    fan: { name: "Algebra" },
                    vaqtOraliq: { nomi: "1-para", boshlanishVaqti: "08:30" },
                  },
                ],
                [{ id: "teacher1", firstName: "Oybek", lastName: "Raxmonov" }],
              ];
            }

            throw new Error("Unexpected transaction call");
          },
        },
      ],
      async () => {
        await getMyClassBaholar(
          { user: { sub: "user1" }, query: { page: "1", limit: "20" } },
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
    assert.equal(payload?.isAnonymized, true);
    assert.equal(payload?.total, 1);
    assert.equal(payload?.baholar?.length, 1);
    assert.equal(Object.hasOwn(payload.baholar[0], "student"), false);
    assert.equal(payload?.baholar?.[0]?.fan, "Algebra");
    assert.equal(payload?.baholar?.[0]?.ortachaFoiz, 80);
  },
);
