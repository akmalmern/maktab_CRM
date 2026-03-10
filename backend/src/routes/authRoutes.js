const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { validateBody } = require("../middlewares/validate");
const { loginRateLimit, refreshRateLimit } = require("../middlewares/rateLimit");
const { requireAuth } = require("../middlewares/auth");
const { requireCsrfToken } = require("../middlewares/csrf");
const c = require("../controllers/user/authController");
const { loginSchema } = require("../validators/authSchemas");

router.post("/login", loginRateLimit, validateBody(loginSchema), asyncHandler(c.login));
router.post("/refresh", refreshRateLimit, requireCsrfToken, asyncHandler(c.refresh));
router.post("/logout", requireCsrfToken, asyncHandler(c.logout));
router.get("/me", requireAuth, asyncHandler(c.me));

module.exports = router;
