const test = require("node:test");
const assert = require("node:assert/strict");

const classroomRepository = require("../src/modules/classrooms/repository");
const classroomQueries = require("../src/modules/classrooms/use-cases/queryClassrooms");

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

test("listClassrooms maps active classroom rows and academic year list", async () => {
  const result = await runWithStubs(
    [
      {
        obj: classroomRepository,
        key: "listActiveClassrooms",
        value: async () => [
          {
            id: "c1",
            name: "8-A",
            academicYear: "2025-2026",
            isArchived: false,
            createdAt: new Date("2025-09-01T00:00:00.000Z"),
            updatedAt: new Date("2025-09-01T00:00:00.000Z"),
            _count: { enrollments: 15 },
          },
          {
            id: "c2",
            name: "9-A",
            academicYear: "2024-2025",
            isArchived: false,
            createdAt: new Date("2024-09-01T00:00:00.000Z"),
            updatedAt: new Date("2024-09-01T00:00:00.000Z"),
            _count: { enrollments: 12 },
          },
        ],
      },
    ],
    async () => classroomQueries.listClassrooms(),
  );

  assert.equal(result.ok, true);
  assert.equal(result.classrooms.length, 2);
  assert.equal(result.classrooms[0].studentCount, 15);
  assert.deepEqual(result.academicYears, ["2025-2026", "2024-2025"]);
});

test("getClassroomStudents sanitizes page/limit/search before repository call", async () => {
  let listArgs = null;
  const result = await runWithStubs(
    [
      {
        obj: classroomRepository,
        key: "findClassroomById",
        value: async () => ({
          id: "class-1",
          name: "8-A",
          academicYear: "2025-2026",
          isArchived: false,
        }),
      },
      {
        obj: classroomRepository,
        key: "listClassroomStudentsPage",
        value: async (args) => {
          listArgs = args;
          return {
            students: [{ id: "student-1" }],
            total: 1,
            page: args.page,
            limit: args.limit,
            pages: 1,
          };
        },
      },
    ],
    async () =>
      classroomQueries.getClassroomStudents({
        classroomId: "class-1",
        page: "0",
        limit: "1000",
        search: "  ali  ",
      }),
  );

  assert.equal(result.ok, true);
  assert.equal(listArgs.page, 1);
  assert.equal(listArgs.limit, 100);
  assert.equal(listArgs.search, "ali");
});

test("getClassroomStudents throws not-found error for archived classroom", async () => {
  await assert.rejects(
    runWithStubs(
      [
        {
          obj: classroomRepository,
          key: "findClassroomById",
          value: async () => ({
            id: "class-1",
            name: "8-A",
            academicYear: "2025-2026",
            isArchived: true,
          }),
        },
      ],
      async () =>
        classroomQueries.getClassroomStudents({
          classroomId: "class-1",
          page: 1,
          limit: 20,
        }),
    ),
    (error) => {
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "CLASSROOM_NOT_FOUND");
      return true;
    },
  );
});
