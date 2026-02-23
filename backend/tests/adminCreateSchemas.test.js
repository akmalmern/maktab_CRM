const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTeacherSchema,
  createStudentSchema,
  createClassroomSchema,
} = require("../src/validators/adminCreateSchemas");

test("createTeacherSchema requires valid cuid subjectId", () => {
  const parsed = createTeacherSchema.safeParse({
    firstName: "Ali",
    lastName: "Valiyev",
    birthDate: "2001-01-10",
    yashashManzili: "Toshkent",
    subjectId: "bad-id",
    phone: null,
  });

  assert.equal(parsed.success, false);
});

test("createStudentSchema requires classroomId", () => {
  const parsed = createStudentSchema.safeParse({
    firstName: "Akmal",
    lastName: "Tursunov",
    birthDate: "2012-05-11",
    yashashManzili: "Fargona",
    phone: null,
    parentPhone: null,
  });

  assert.equal(parsed.success, false);
});

test("createClassroomSchema rejects invalid name format", () => {
  const parsed = createClassroomSchema.safeParse({
    name: "Class A",
    academicYear: "2025-2026",
  });

  assert.equal(parsed.success, false);
});

test("createClassroomSchema rejects invalid academicYear range", () => {
  const parsed = createClassroomSchema.safeParse({
    name: "7-A",
    academicYear: "2025-2028",
  });

  assert.equal(parsed.success, false);
});

test("createClassroomSchema normalizes valid name and academicYear", () => {
  const parsed = createClassroomSchema.safeParse({
    name: " 7 - a ",
    academicYear: " 2025 - 2026 ",
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, "7-A");
  assert.equal(parsed.data.academicYear, "2025-2026");
});

test("createClassroomSchema accepts long suffix and preserves it", () => {
  const parsed = createClassroomSchema.safeParse({
    name: " 10 - FizMat ",
    academicYear: "2025-2026",
  });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.name, "10-FizMat");
});
