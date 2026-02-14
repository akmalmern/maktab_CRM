const jwt = require("jsonwebtoken");

function getEnv(name) {
  const value = process.env[name];
  if (!value)
    throw new Error(`❌ Environment variable ${name} is missing in .env`);
  return value;
}

function signAccessToken(payload) {
  return jwt.sign(payload, getEnv("JWT_ACCESS_SECRET"), {
    expiresIn: process.env.ACCESS_EXPIRES || "15m",
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, getEnv("JWT_REFRESH_SECRET"), {
    expiresIn: process.env.REFRESH_EXPIRES || "7d",
  });
}

function verifyAccess(token) {
  return jwt.verify(token, getEnv("JWT_ACCESS_SECRET"));
}

function verifyRefresh(token) {
  return jwt.verify(token, getEnv("JWT_REFRESH_SECRET"));
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
};
