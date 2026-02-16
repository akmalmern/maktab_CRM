const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { z } = require("zod");

const c = require("../controllers/admin/adminDetialController");

const IdParamSchema = z.object({ id: z.string().cuid() });

router.get(
  "/students/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema }),
  asyncHandler(c.getStudentDetail),
);

router.get(
  "/teachers/:id",
  requireAuth,
  requireRole("ADMIN"),
  validate({ params: IdParamSchema }),
  asyncHandler(c.getTeacherDetail),
);

module.exports = router;
