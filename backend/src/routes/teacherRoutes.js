const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate, validateBody } = require("../middlewares/validate");
const attendance = require("../controllers/teacher/attendanceController");
const schedule = require("../controllers/teacher/scheduleController");
const grades = require("../controllers/teacher/gradeController");
const {
  sanaQuerySchema,
  davomatTarixQuerySchema,
  darsIdParamSchema,
  davomatSaqlashSchema,
} = require("../validators/attendanceSchemas");
const { listBaholarQuerySchema } = require("../validators/gradeSchemas");

router.get(
  "/jadval",
  requireAuth,
  requireRole("TEACHER"),
  asyncHandler(schedule.getTeacherHaftalikJadval),
);

router.get(
  "/davomat/darslar",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: sanaQuerySchema }),
  asyncHandler(attendance.getTeacherDarslar),
);

router.get(
  "/davomat/dars/:darsId",
  requireAuth,
  requireRole("TEACHER"),
  validate({ params: darsIdParamSchema, query: sanaQuerySchema }),
  asyncHandler(attendance.getDarsDavomati),
);

router.post(
  "/davomat/dars/:darsId",
  requireAuth,
  requireRole("TEACHER"),
  validate({ params: darsIdParamSchema }),
  validateBody(davomatSaqlashSchema),
  asyncHandler(attendance.saveDarsDavomati),
);

router.get(
  "/davomat/tarix",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: davomatTarixQuerySchema }),
  asyncHandler(attendance.getTeacherAttendanceHistory),
);

router.get(
  "/baholar",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: listBaholarQuerySchema }),
  asyncHandler(grades.getTeacherBaholari),
);

module.exports = router;
