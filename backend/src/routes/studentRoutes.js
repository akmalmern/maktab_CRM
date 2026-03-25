const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate, validateBody } = require("../middlewares/validate");
const {
  uploadAvatar,
  verifyUploadedAvatarSignature,
  handleMulterErrors,
} = require("../middlewares/avatarUpload");
const attendance = require("../controllers/student/attendanceController");
const schedule = require("../controllers/student/scheduleController");
const grades = require("../controllers/student/gradeController");
const profile = require("../controllers/student/profileController");
const { createSelfServiceHandlers } = require("../controllers/user/selfServiceController");
const { davomatTarixQuerySchema } = require("../validators/attendanceSchemas");
const { listBaholarQuerySchema } = require("../validators/gradeSchemas");
const { studentJadvalQuerySchema } = require("../validators/jadvalSchemas");
const {
  selfProfileUpdateSchema,
  selfPasswordChangeSchema,
} = require("../validators/selfProfileSchemas");
const studentProfilePaths = ["/profil", "/profile"];
const studentProfilePasswordPaths = ["/profil/password", "/profile/password"];
const studentProfileAvatarPaths = ["/profil/avatar", "/profile/avatar"];
const selfService = createSelfServiceHandlers("STUDENT");

router.get(
  studentProfilePaths,
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(profile.getMyProfile),
);

router.patch(
  studentProfilePaths,
  requireAuth,
  requireRole("STUDENT"),
  validateBody(selfProfileUpdateSchema),
  asyncHandler(selfService.updateProfile),
);

router.post(
  studentProfilePasswordPaths,
  requireAuth,
  requireRole("STUDENT"),
  validateBody(selfPasswordChangeSchema),
  asyncHandler(selfService.changePassword),
);

router.post(
  studentProfileAvatarPaths,
  requireAuth,
  requireRole("STUDENT"),
  uploadAvatar.single("file"),
  verifyUploadedAvatarSignature,
  handleMulterErrors,
  asyncHandler(selfService.uploadAvatar),
);

router.delete(
  studentProfileAvatarPaths,
  requireAuth,
  requireRole("STUDENT"),
  asyncHandler(selfService.deleteAvatar),
);

router.get(
  "/jadval",
  requireAuth,
  requireRole("STUDENT"),
  validate({ query: studentJadvalQuerySchema }),
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
