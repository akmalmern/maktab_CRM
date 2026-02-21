const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const { getStudentHaftalikJadval } = require("../src/controllers/student/scheduleController");

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
  "getStudentHaftalikJadval defaults to active classroom academic year",
  { concurrency: false },
  async () => {
    let payload = null;

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
          obj: prisma.darsJadvali,
          key: "findFirst",
          value: async () => {
            throw new Error("findFirst should not be called when classroom year exists");
          },
        },
        {
          obj: prisma.darsJadvali,
          key: "findMany",
          value: async () => [],
        },
      ],
      async () => {
        await getStudentHaftalikJadval(
          { user: { sub: "user1" }, query: {} },
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
    assert.equal(payload?.oquvYili, "2025-2026");
    assert.equal(payload?.student?.sinf?.name, "10-A");
  },
);
