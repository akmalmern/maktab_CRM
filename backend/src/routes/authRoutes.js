const router = require("express").Router();
const { asyncHandler } = require("../middlewares/asyncHandler");
const c = require("../controllers/user/authController");

router.post("/login", asyncHandler(c.login));

module.exports = router;
