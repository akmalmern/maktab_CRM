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

module.exports = { genUsernameBase, genUsernameUnique, genPassword };
