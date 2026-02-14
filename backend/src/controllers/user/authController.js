const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
} = require("../../utils/tokens");

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // prod: true (https)
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    throw new ApiError(400, "VALIDATION_ERROR", "username/password majburiy");

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive)
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Login yoki parol noto‘g‘ri",
    );

  const ok = await bcrypt.compare(password, user.password);
  if (!ok)
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Login yoki parol noto‘g‘ri",
    );

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

  res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

  res.json({ ok: true, accessToken, role: user.role });
}

module.exports = { login };
