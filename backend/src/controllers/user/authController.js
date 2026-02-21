const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { ApiError } = require("../../utils/apiError");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
} = require("../../utils/tokens");

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "VALIDATION_ERROR", "username/password majburiy");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Login yoki parol noto'g'ri",
    );
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Login yoki parol noto'g'ri",
    );
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.json({ ok: true, accessToken, role: user.role });
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(401, "REFRESH_TOKEN_MISSING", "Refresh token topilmadi");
  }

  let payload;
  try {
    payload = verifyRefresh(token);
  } catch (_e) {
    throw new ApiError(
      401,
      "REFRESH_TOKEN_INVALID",
      "Refresh token noto'g'ri yoki eskirgan",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, "USER_INVALID", "Foydalanuvchi yaroqsiz");
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  res.cookie("refreshToken", refreshToken, getCookieOptions());

  res.json({
    ok: true,
    message: req.t("messages.TOKEN_REFRESHED"),
    accessToken,
    role: user.role,
  });
}

async function logout(_req, res) {
  res.clearCookie("refreshToken", {
    ...getCookieOptions(),
    maxAge: undefined,
  });
  res.json({ ok: true, message: req.t("messages.LOGOUT_SUCCESS") });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      role: true,
      username: true,
      phone: true,
      isActive: true,
      admin: {
        select: {
          firstName: true,
          lastName: true,
          avatarPath: true,
        },
      },
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          avatarPath: true,
        },
      },
      student: {
        select: {
          firstName: true,
          lastName: true,
          avatarPath: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "USER_INVALID", "Foydalanuvchi yaroqsiz");
  }

  const profile = user.admin || user.teacher || user.student || null;
  const fullName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : user.username;

  res.json({
    ok: true,
    user: {
      id: user.id,
      role: user.role,
      username: user.username,
      phone: user.phone || null,
      fullName: fullName || user.username,
      avatarPath: profile?.avatarPath || null,
    },
  });
}

module.exports = { login, refresh, logout, me };
