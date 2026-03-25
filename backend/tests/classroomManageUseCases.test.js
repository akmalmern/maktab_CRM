const test = require("node:test");
const assert = require("node:assert/strict");

const classroomRepository = require("../src/modules/classrooms/repository");
const classroomCommands = require("../src/modules/classrooms/use-cases/manageClassrooms");

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

test("createClassroom restores archived classroom with same name/year", async () => {
  const result = await runWithStubs(
    [
      {
        obj: classroomRepository,
        key: "findClassroomByNameAndAcademicYear",
        value: async () => ({ id: "c-archived", isArchived: true }),
      },
      {
        obj: classroomRepository,
        key: "restoreArchivedClassroom",
        value: async (id) => ({ id, name: "10-A", academicYear: "2026-2027" }),
      },
    ],
    async () =>
      classroomCommands.createClassroom({
        name: "10-A",
        academicYear: "2026-2027",
      }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.restored, true);
  assert.equal(result.classroom.id, "c-archived");
});

test("removeStudentFromClassroom closes only active enrollment in selected classroom", async () => {
  let removePayload = null;

  const result = await runWithStubs(
    [
      {
        obj: classroomRepository,
        key: "findClassroomById",
        value: async () => ({
          id: "class-1",
          name: "8-A",
          academicYear: "2026-2027",
          isArchived: false,
        }),
      },
      {
        obj: classroomRepository,
        key: "findStudentById",
        value: async () => ({ id: "student-1" }),
      },
      {
        obj: classroomRepository,
        key: "deactivateStudentEnrollmentInClassroom",
        value: async (payload) => {
          removePayload = payload;
          return { count: 1 };
        },
      },
    ],
    async () =>
      classroomCommands.removeStudentFromClassroom({
        classroomId: "class-1",
        studentId: "student-1",
      }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.removed, true);
  assert.equal(result.studentId, "student-1");
  assert.equal(removePayload.classroomId, "class-1");
  assert.equal(removePayload.studentId, "student-1");
  assert.ok(removePayload.endedAt instanceof Date);
});
