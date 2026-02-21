const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const prisma = require("../src/prisma");

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "student-test-secret";

function buildStudentToken() {
  return jwt.sign(
    { sub: "user-student-1", role: "STUDENT" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" },
  );
}

async function withServer(fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port =
    typeof address === "object" && address
      ? address.port
      : Number.parseInt(String(address || "").split(":").pop(), 10);
  if (!Number.isFinite(Number(port)) || Number(port) <= 0) {
    throw new Error(`Test server port topilmadi: ${String(address)}`);
  }
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

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

async function requestJson({ baseUrl, path, token }) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

test(
  "GET /api/student/profil returns dashboard payload",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();
    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findFirst",
          value: async () => ({
            id: "student1",
            firstName: "Akmal",
            lastName: "Tursunov",
            createdAt: new Date("2025-01-01T00:00:00.000Z"),
            user: { username: "student1", phone: "+998901112233" },
            enrollments: [
              {
                isActive: true,
                startDate: new Date("2025-01-01T00:00:00.000Z"),
                endDate: null,
                classroom: { id: "c1", name: "10-A", academicYear: "2025-2026" },
              },
            ],
          }),
        },
        {
          obj: prisma.moliyaSozlama,
          key: "findUnique",
          value: async () => ({ key: "MAIN", oylikSumma: 300000 }),
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
          value: async () => 10,
        },
        {
          obj: prisma.davomat,
          key: "groupBy",
          value: async () => [
            { holat: "KELDI", _count: { _all: 8 } },
            { holat: "SABABSIZ", _count: { _all: 2 } },
          ],
        },
        {
          obj: prisma.baho,
          key: "findMany",
          value: async () => [
            {
              id: "b1",
              sana: new Date("2026-02-20T00:00:00.000Z"),
              turi: "JORIY",
              ball: 4,
              maxBall: 5,
              darsJadvali: { fan: { name: "Algebra" } },
            },
          ],
        },
        {
          obj: prisma.tolovTranzaksiya,
          key: "findMany",
          value: async () => [],
        },
      ],
      async () =>
        withServer(async (baseUrl) => {
          const res = await requestJson({
            baseUrl,
            path: "/api/student/profil",
            token,
          });
          assert.equal(res.status, 200);
          assert.equal(res.body.ok, true);
          assert.equal(Boolean(res.body.profile?.dashboard), true);
          assert.equal(res.body.profile.dashboard.davomat.foiz, 80);
        }),
    );
  },
);

test(
  "GET /api/student/jadval returns oquvYillar for dropdown",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();
    let findManyCall = 0;

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
          key: "findMany",
          value: async () => {
            findManyCall += 1;
            if (findManyCall === 1) {
              return [{ oquvYili: "2025-2026" }, { oquvYili: "2024-2025" }];
            }
            return [];
          },
        },
      ],
      async () =>
        withServer(async (baseUrl) => {
          const res = await requestJson({
            baseUrl,
            path: "/api/student/jadval",
            token,
          });
          assert.equal(res.status, 200);
          assert.equal(res.body.ok, true);
          assert.deepEqual(res.body.oquvYillar, ["2025-2026", "2024-2025"]);
        }),
    );
  },
);

test(
  "GET /api/student/davomat supports server pagination and holat filter",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();

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
            3,
            [
              {
                id: "dav1",
                darsJadvaliId: "dars1",
                sana: new Date("2026-02-20T00:00:00.000Z"),
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
            [{ holat: "KELDI", _count: { _all: 3 } }],
          ],
        },
        {
          obj: prisma.baho,
          key: "findMany",
          value: async () => [],
        },
      ],
      async () =>
        withServer(async (baseUrl) => {
          const res = await requestJson({
            baseUrl,
            path: "/api/student/davomat?sana=2026-02-20&periodType=OYLIK&holat=KELDI&page=2&limit=1",
            token,
          });
          assert.equal(res.status, 200);
          assert.equal(res.body.ok, true);
          assert.equal(res.body.page, 2);
          assert.equal(res.body.limit, 1);
          assert.equal(res.body.holat, "KELDI");
          assert.equal(res.body.total, 3);
        }),
    );
  },
);

test(
  "GET /api/student/baholar returns paginated personal grades",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();

    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findUnique",
          value: async () => ({ id: "student1", firstName: "Akmal", lastName: "Tursunov" }),
        },
        {
          obj: prisma,
          key: "$transaction",
          value: async () => [
            [
              {
                id: "b1",
                sana: new Date("2026-02-20T00:00:00.000Z"),
                turi: "JORIY",
                ball: 4,
                maxBall: 5,
                izoh: "",
                teacher: { firstName: "Oybek", lastName: "Raxmonov" },
                darsJadvali: {
                  sinf: { name: "10-A", academicYear: "2025-2026" },
                  fan: { name: "Algebra" },
                  vaqtOraliq: { nomi: "1-para", boshlanishVaqti: "08:30" },
                },
              },
            ],
            1,
            [{ turi: "JORIY", ball: 4, maxBall: 5 }],
          ],
        },
      ],
      async () =>
        withServer(async (baseUrl) => {
          const res = await requestJson({
            baseUrl,
            path: "/api/student/baholar?sana=2026-02-20&page=1&limit=20",
            token,
          });
          assert.equal(res.status, 200);
          assert.equal(res.body.ok, true);
          assert.equal(res.body.total, 1);
          assert.equal(res.body.baholar.length, 1);
        }),
    );
  },
);

test(
  "GET /api/student/sinf-baholar returns anonymized aggregate",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();
    let txCount = 0;

    await runWithStubs(
      [
        {
          obj: prisma.student,
          key: "findUnique",
          value: async () => ({
            id: "student1",
            enrollments: [{ classroom: { id: "class1", name: "10-A", academicYear: "2025-2026" } }],
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
                    sana: new Date("2026-02-20T00:00:00.000Z"),
                    turi: "JORIY",
                    darsJadvaliId: "d1",
                    teacherId: "t1",
                    _count: { _all: 2 },
                    _avg: { ball: 8, maxBall: 10 },
                    _min: { ball: 7 },
                    _max: { ball: 9 },
                  },
                ],
                [{ turi: "JORIY", ball: 8, maxBall: 10 }],
              ];
            }
            return [
              [{ id: "d1", fan: { name: "Algebra" }, vaqtOraliq: { nomi: "1-para", boshlanishVaqti: "08:30" } }],
              [{ id: "t1", firstName: "Oybek", lastName: "Raxmonov" }],
            ];
          },
        },
      ],
      async () =>
        withServer(async (baseUrl) => {
          const res = await requestJson({
            baseUrl,
            path: "/api/student/sinf-baholar?sana=2026-02-20&page=1&limit=20",
            token,
          });
          assert.equal(res.status, 200);
          assert.equal(res.body.ok, true);
          assert.equal(res.body.isAnonymized, true);
          assert.equal(Object.hasOwn(res.body.baholar[0], "student"), false);
        }),
    );
  },
);

test(
  "GET /api/student/jadval rejects invalid query format",
  { concurrency: false },
  async () => {
    const token = buildStudentToken();
    await withServer(async (baseUrl) => {
      const res = await requestJson({
        baseUrl,
        path: "/api/student/jadval?oquvYili=bad-format",
        token,
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.ok, false);
      assert.equal(res.body.error?.code, "VALIDATION_ERROR");
    });
  },
);
