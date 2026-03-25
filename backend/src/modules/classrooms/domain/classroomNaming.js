const MAX_GRADE = 11;

function collapseWhitespace(value) {
  return String(value || "").trim().replace(/\s{2,}/g, " ");
}

function normalizeClassroomName(value) {
  const raw = collapseWhitespace(value);
  if (!raw) return "";

  const dashIndex = raw.indexOf("-");
  if (dashIndex < 0) return raw;

  const gradeRaw = raw.slice(0, dashIndex).trim();
  const suffixRaw = collapseWhitespace(raw.slice(dashIndex + 1));
  const grade = Number.parseInt(gradeRaw, 10);

  if (!Number.isFinite(grade)) return raw;

  if (!suffixRaw) return `${grade}-`;
  const suffix = suffixRaw.length === 1 ? suffixRaw.toUpperCase() : suffixRaw;
  return `${grade}-${suffix}`;
}

function parseClassName(value) {
  const normalized = normalizeClassroomName(value);
  const match = normalized.match(/^(\d{1,2})\s*-\s*(.+)$/u);
  if (!match) return null;

  const grade = Number.parseInt(match[1], 10);
  const suffix = collapseWhitespace(match[2]);
  if (!Number.isFinite(grade) || grade < 1 || grade > MAX_GRADE || !suffix) {
    return null;
  }

  return {
    grade,
    suffix,
  };
}

function buildTargetName(grade, suffix) {
  return `${grade}-${suffix}`;
}

module.exports = {
  MAX_GRADE,
  collapseWhitespace,
  normalizeClassroomName,
  parseClassName,
  buildTargetName,
};
