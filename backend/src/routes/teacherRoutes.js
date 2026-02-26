const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate, validateBody } = require("../middlewares/validate");
const attendance = require("../controllers/teacher/attendanceController");
const schedule = require("../controllers/teacher/scheduleController");
const grades = require("../controllers/teacher/gradeController");
const profile = require("../controllers/teacher/profileController");
const payroll = require("../controllers/teacher/payrollController");
const {
  sanaQuerySchema,
  teacherDarslarQuerySchema,
  davomatTarixQuerySchema,
  darsIdParamSchema,
  davomatSaqlashSchema,
} = require("../validators/attendanceSchemas");
const { listBaholarQuerySchema } = require("../validators/gradeSchemas");
const { studentJadvalQuerySchema } = require("../validators/jadvalSchemas");
const {
  payrollRunIdParamSchema,
  payrollRunLinesQuerySchema,
  teacherPayslipListQuerySchema,
} = require("../validators/payrollSchemas");

router.get(
  "/profil",
  requireAuth,
  requireRole("TEACHER"),
  asyncHandler(profile.getTeacherProfile),
);

router.get(
  "/jadval",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: studentJadvalQuerySchema }),
  asyncHandler(schedule.getTeacherHaftalikJadval),
);

router.get(
  "/davomat/darslar",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: teacherDarslarQuerySchema }),
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

router.get(
  "/oyliklar",
  requireAuth,
  requireRole("TEACHER"),
  validate({ query: teacherPayslipListQuerySchema }),
  asyncHandler(payroll.getTeacherPayslips),
);

router.get(
  "/oyliklar/:runId",
  requireAuth,
  requireRole("TEACHER"),
  validate({ params: payrollRunIdParamSchema, query: payrollRunLinesQuerySchema }),
  asyncHandler(payroll.getTeacherPayslipDetail),
);

module.exports = router;
