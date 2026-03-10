const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { ApiError } = require("../../utils/apiError");
const {
  signAccessToken,
  verifyRefresh,
  issueRefreshToken,
  hashToken,
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

function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: false,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function buildRequestMeta(req) {
  const xff = req?.headers?.["x-forwarded-for"];
  const ip = typeof xff === "string" && xff.trim()
    ? xff.split(",")[0].trim()
    : req?.ip || req?.socket?.remoteAddress || null;
  const userAgent = req?.headers?.["user-agent"]
    ? String(req.headers["user-agent"]).slice(0, 512)
    : null;
  return { ip, userAgent };
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function createRefreshSession({ userId, refreshToken, jti, expiresAt, req }) {
  if (!jti || !expiresAt) {
    throw new ApiError(500, "REFRESH_ISSUE_FAILED", "Refresh token yaratishda xatolik");
  }

  const { ip, userAgent } = buildRequestMeta(req);
  return prisma.refreshSession.create({
    data: {
      userId,
      jti,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      ip,
      userAgent,
    },
  });
}

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, "VALIDATION_ERROR", "username/password majburiy");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Login yoki parol noto'g'ri");
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Login yoki parol noto'g'ri");
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: refreshToken, jti, expiresAt } = issueRefreshToken({
    sub: user.id,
    role: user.role,
  });

  await createRefreshSession({
    userId: user.id,
    refreshToken,
    jti,
    expiresAt,
    req,
  });

  res.cookie("refreshToken", refreshToken, getCookieOptions());
  res.cookie("csrfToken", createCsrfToken(), getCsrfCookieOptions());

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
    throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token noto'g'ri yoki eskirgan");
  }

  if (!payload?.sub || !payload?.jti) {
    throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token noto'g'ri yoki eskirgan");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, "USER_INVALID", "Foydalanuvchi yaroqsiz");
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.refreshSession.findFirst({
    where: {
      userId: user.id,
      jti: String(payload.jti),
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true },
  });

  if (!session) {
    throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token noto'g'ri yoki eskirgan");
  }

  const { token: nextRefreshToken, jti: nextJti, expiresAt: nextExpiresAt } = issueRefreshToken({
    sub: user.id,
    role: user.role,
  });

  const { ip, userAgent } = buildRequestMeta(req);

  await prisma.$transaction(async (tx) => {
    const revoked = await tx.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: {
        revokedAt: now,
        replacedByJti: nextJti,
      },
    });

    if (revoked.count !== 1) {
      throw new ApiError(401, "REFRESH_TOKEN_INVALID", "Refresh token noto'g'ri yoki eskirgan");
    }

    await tx.refreshSession.create({
      data: {
        userId: user.id,
        jti: nextJti,
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: nextExpiresAt,
        ip,
        userAgent,
      },
    });
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  res.cookie("refreshToken", nextRefreshToken, getCookieOptions());
  res.cookie("csrfToken", createCsrfToken(), getCsrfCookieOptions());

  res.json({
    ok: true,
    message: req.t("messages.TOKEN_REFRESHED"),
    accessToken,
    role: user.role,
  });
}

async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  const now = new Date();

  if (token) {
    try {
      const payload = verifyRefresh(token);
      if (payload?.sub && payload?.jti) {
        await prisma.refreshSession.updateMany({
          where: {
            userId: payload.sub,
            jti: String(payload.jti),
            tokenHash: hashToken(token),
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
      }
    } catch {
      // Token invalid bo'lsa ham cookie tozalanadi.
    }
  }

  res.clearCookie("refreshToken", {
    ...getCookieOptions(),
    maxAge: undefined,
  });
  res.clearCookie("csrfToken", {
    ...getCsrfCookieOptions(),
    maxAge: undefined,
  });

  res.json({
    ok: true,
    message: typeof req.t === "function" ? req.t("messages.LOGOUT_SUCCESS") : "Logout qilindi",
  });
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
