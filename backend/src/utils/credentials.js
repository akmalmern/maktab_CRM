const crypto = require("crypto");

function toSlugLower(s = "") {
  return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function birthYearFromDate(birthDate) {
  if (!birthDate) return null;
  const y = new Date(birthDate).getFullYear();
  return Number.isFinite(y) ? String(y) : null;
}

function genUsernameBase(firstName) {
  return toSlugLower(firstName) || "user";
}

function genUsernameUnique(base) {
  const rnd = Math.floor(100 + Math.random() * 900);
  return `${base}${rnd}`;
}

function genPassword(firstName, birthDate) {
  const base = genUsernameBase(firstName);

  let year = "0000";
  if (birthDate instanceof Date) year = String(birthDate.getFullYear());
  else {
    const y = new Date(birthDate).getFullYear();
    year = Number.isFinite(y) ? String(y) : "0000";
  }

  return `${base}${year}`;
}

function genSecurePassword(length = 14) {
  const safeLength = Math.max(12, Math.min(64, Number(length) || 14));
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_+=?";
  const all = `${lower}${upper}${digits}${symbols}`;

  const required = [
    lower[crypto.randomInt(lower.length)],
    upper[crypto.randomInt(upper.length)],
    digits[crypto.randomInt(digits.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];

  const extra = Array.from({ length: safeLength - required.length }, () =>
    all[crypto.randomInt(all.length)],
  );

  const chars = [...required, ...extra];
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

module.exports = { genUsernameBase, genUsernameUnique, genPassword, genSecurePassword };
