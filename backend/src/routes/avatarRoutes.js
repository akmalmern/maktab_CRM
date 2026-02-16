const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { requireAuth, requireRole } = require("../middlewares/auth");
const {
  uploadAvatar,
  handleMulterErrors,
} = require("../middlewares/avatarUpload");

const c = require("../controllers/admin/avatarController");

// upload/replace avatar
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  uploadAvatar.single("file"),
  handleMulterErrors,
  asyncHandler(c.adminUploadAvatar),
);

// delete avatar
router.delete(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(c.adminDeleteAvatar),
);

module.exports = router;
