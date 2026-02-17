const path = require("path");
const fs = require("fs");
const { ApiError } = require("../../utils/apiError");
const { genUsernameUnique } = require("../../utils/credentials");

async function pickFreeUsername(tx, base) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = genUsernameUnique(base);
    const exists = await tx.user.findUnique({ where: { username: candidate } });
    if (!exists) return candidate;
  }
  return `${base}${Date.now().toString().slice(-6)}`;
}

function cleanOptional(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function toDateOrThrow(birthDate) {
  const d = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "birthDate noto'g'ri. Format: YYYY-MM-DD (1997-09-21)",
    );
  }
  return d;
}

function removeFileBestEffort(filePath) {
  if (!filePath) return;
  try {
    const abs = path.join(process.cwd(), filePath.replace(/^\//, ""));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {}
}

function parseIntSafe(v, def) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function buildSearchWhere(search) {
  const s = cleanOptional(search);
  if (!s) return {};
  return {
    OR: [
      { firstName: { contains: s, mode: "insensitive" } },
      { lastName: { contains: s, mode: "insensitive" } },
    ],
  };
}

module.exports = {
  pickFreeUsername,
  cleanOptional,
  toDateOrThrow,
  removeFileBestEffort,
  parseIntSafe,
  buildSearchWhere,
};
