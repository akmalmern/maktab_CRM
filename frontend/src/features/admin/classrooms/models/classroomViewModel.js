export function collapseDraftName(value) {
  return String(value || '').replace(/\s{2,}/g, ' ').trim();
}

export function buildAcademicYearOptions(meta, classrooms = []) {
  const metaYears = Array.isArray(meta?.allowedAcademicYears)
    ? meta.allowedAcademicYears.filter(Boolean)
    : [];

  if (metaYears.length) {
    return [...new Set(metaYears)].sort((a, b) => b.localeCompare(a));
  }

  const fallbackYears = [
    meta?.currentAcademicYear,
    meta?.nextAcademicYear,
    ...classrooms.map((item) => item.academicYear),
  ].filter(Boolean);

  return [...new Set(fallbackYears)].sort((a, b) => b.localeCompare(a));
}

export function getPreferredAcademicYear(meta, classrooms = []) {
  const options = buildAcademicYearOptions(meta, classrooms);
  if (meta?.currentAcademicYear && options.includes(meta.currentAcademicYear)) {
    return meta.currentAcademicYear;
  }
  return options[0] || '';
}

export function formatClassroomLabel(classroom) {
  if (!classroom) return '';
  return `${classroom.name} (${classroom.academicYear})`;
}
