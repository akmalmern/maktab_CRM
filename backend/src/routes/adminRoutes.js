const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validateBody } = require("../middlewares/validate");

const c = require("../controllers/admin/adminCreateController");
const {
  createTeacherSchema,
  createStudentSchema,
} = require("../validators/adminCreateSchemas");

router.post(
  "/teachers",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createTeacherSchema),
  asyncHandler(c.createTeacher),
);

router.post(
  "/students",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(createStudentSchema),
  asyncHandler(c.createStudent),
);

module.exports = router;
