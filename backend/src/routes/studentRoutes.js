const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const attendance = require("../controllers/student/attendanceController");
const schedule = require("../controllers/student/scheduleController");
const grades = require("../controllers/student/gradeController");
const profile = require("../controllers/student/profileController");
const { davomatTarixQuerySchema } = require("../validators/attendanceSchemas");
const { listBaholarQuerySchema } = require("../validators/gradeSchemas");

router.get(
  "/profil",
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(profile.getMyProfile),
);

router.get(
  "/jadval",
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(schedule.getStudentHaftalikJadval),
);

router.get(
  "/davomat",
  requireAuth,
  requireRole("STUDENT"),
  validate({ query: davomatTarixQuerySchema.omit({ classroomId: true }) }),
  asyncHandler(attendance.getMyAttendance),
);

router.get(
  "/baholar",
  requireAuth,
  requireRole("STUDENT"),
  validate({ query: listBaholarQuerySchema.omit({ classroomId: true, studentId: true, teacherId: true }) }),
  asyncHandler(grades.getMyBaholar),
);

router.get(
  "/sinf-baholar",
  requireAuth,
  requireRole("STUDENT"),
  validate({ query: listBaholarQuerySchema.omit({ classroomId: true, studentId: true, teacherId: true }) }),
  asyncHandler(grades.getMyClassBaholar),
);

module.exports = router;
