const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing in .env`);
  }
  return value;
}

function tokenOptions() {
  return {
    issuer: process.env.JWT_ISSUER || "maktab-crm",
    audience: process.env.JWT_AUDIENCE || "maktab-crm-users",
  };
}

function signAccessToken(payload) {
  return jwt.sign(payload, getEnv("JWT_ACCESS_SECRET"), {
    expiresIn: process.env.ACCESS_EXPIRES || "15m",
    ...tokenOptions(),
  });
}

function signRefreshToken(payload, { jti } = {}) {
  return jwt.sign({ ...payload, jti: jti || crypto.randomUUID() }, getEnv("JWT_REFRESH_SECRET"), {
    expiresIn: process.env.REFRESH_EXPIRES || "7d",
    ...tokenOptions(),
  });
}

function verifyAccess(token) {
  return jwt.verify(token, getEnv("JWT_ACCESS_SECRET"), tokenOptions());
}

function verifyRefresh(token) {
  return jwt.verify(token, getEnv("JWT_REFRESH_SECRET"), tokenOptions());
}

function issueRefreshToken(payload, { jti } = {}) {
  const token = signRefreshToken(payload, { jti });
  const decoded = jwt.decode(token);

  const tokenJti = decoded?.jti || jti || null;
  const expiresAt =
    Number.isFinite(Number(decoded?.exp)) && Number(decoded.exp) > 0
      ? new Date(Number(decoded.exp) * 1000)
      : null;

  return {
    token,
    jti: tokenJti,
    expiresAt,
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
  issueRefreshToken,
  hashToken,
};
