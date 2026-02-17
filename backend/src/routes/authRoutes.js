const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const { validateBody } = require("../middlewares/validate");
const { loginRateLimit, refreshRateLimit } = require("../middlewares/rateLimit");
const c = require("../controllers/user/authController");
const { loginSchema } = require("../validators/authSchemas");

router.post("/login", loginRateLimit, validateBody(loginSchema), asyncHandler(c.login));
router.post("/refresh", refreshRateLimit, asyncHandler(c.refresh));
router.post("/logout", asyncHandler(c.logout));

module.exports = router;
