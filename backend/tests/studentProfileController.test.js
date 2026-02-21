const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = require("../src/prisma");
const { getMyProfile } = require("../src/controllers/student/profileController");

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
  "getMyProfile computes debt from enrollment periods when no active enrollment",
  { concurrency: false },
  async () => {
    let payload = null;

    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findFirst",
          value: async () => ({
            id: "student1",
            firstName: "Akmal",
            lastName: "Tursunov",
            createdAt: new Date("2020-01-01T00:00:00.000Z"),
            user: { username: "student1", phone: "+998901112233" },
            enrollments: [
              {
                isActive: false,
                startDate: new Date("2025-01-10T00:00:00.000Z"),
                endDate: new Date("2025-03-20T00:00:00.000Z"),
                classroom: null,
              },
            ],
          }),
        },
        {
          obj: prisma.moliyaSozlama,
          key: "findUnique",
          value: async () => ({ key: "MAIN", oylikSumma: 100_000 }),
        },
        {
          obj: prisma.tolovQoplama,
          key: "findMany",
          value: async () => [],
        },
        {
          obj: prisma.tolovImtiyozi,
          key: "findMany",
          value: async () => [],
        },
        {
          obj: prisma.davomat,
          key: "count",
          value: async () => 0,
        },
        {
          obj: prisma.davomat,
          key: "groupBy",
          value: async () => [],
        },
        {
          obj: prisma.baho,
          key: "findMany",
          value: async () => [],
        },
        {
          obj: prisma.tolovTranzaksiya,
          key: "findMany",
          value: async () => [],
        },
      ],
      async () => {
        await getMyProfile(
          { user: { sub: "user1" } },
          {
            json: (value) => {
              payload = value;
              return value;
            },
            status() {
              return this;
            },
          },
        );
      },
    );

    assert.equal(payload?.ok, true);
    assert.equal(payload?.profile?.moliya?.qarzOylarSoni, 3);
    assert.deepEqual(payload?.profile?.moliya?.qarzOylar, [
      "2025-01",
      "2025-02",
      "2025-03",
    ]);
    assert.equal(payload?.profile?.classroom, null);
  },
);
