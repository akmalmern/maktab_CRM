const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTeacherSchema,
  createStudentSchema,
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
