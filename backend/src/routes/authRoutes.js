const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const c = require("../controllers/user/authController");

router.post("/login", asyncHandler(c.login));
router.post("/refresh", asyncHandler(c.refresh));
router.post("/logout", asyncHandler(c.logout));

module.exports = router;
