const test = require("node:test");
const assert = require("node:assert/strict");
const { ApiError } = require("../src/utils/apiError");
const {
  saveTeacherDarsDavomatiByUserId,
} = require("../src/services/attendance/attendanceWriteService");

test("saveTeacherDarsDavomatiByUserId rejects duplicate student payload", async () => {
  let thrown = null;
  try {
    await saveTeacherDarsDavomatiByUserId({
      userId: "user_teacher_1",
      darsId: "cmr0000000000000000000001",
      body: {
        sana: "2026-03-10",
        davomatlar: [
          { studentId: "cmr0000000000000000000002", holat: "KELDI" },
          { studentId: "cmr0000000000000000000002", holat: "SABABSIZ" },
        ],
      },
    });
  } catch (error) {
    thrown = error;
  }

  assert.ok(thrown instanceof ApiError);
  assert.equal(thrown.code, "DAVOMAT_DUPLICATE_STUDENT");
});
