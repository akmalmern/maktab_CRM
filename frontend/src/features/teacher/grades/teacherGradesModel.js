export const BAHO_TURI_OPTIONS = ['ALL', 'JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
export const BAHO_TURI_LABEL_KEYS = {
  ALL: 'Hammasi',
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

export const TEACHER_GRADE_STATS_KEYS = ['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];

export function buildTeacherGradesQuery({ sana, bahoTuri, classroomId, page, limit }) {
  return {
    ...(sana ? { sana } : {}),
    ...(bahoTuri && bahoTuri !== 'ALL' ? { bahoTuri } : {}),
    ...(classroomId && classroomId !== 'ALL' ? { classroomId } : {}),
    page,
    limit,
  };
}

export function formatTeacherGradeTypeLabel(t, value) {
  return t(BAHO_TURI_LABEL_KEYS[value] || value, { defaultValue: value });
}

export function isTeacherGradesFilterPristine({ sana, classroomId, bahoTuri, limit }) {
  return !sana && classroomId === 'ALL' && bahoTuri === 'ALL' && Number(limit) === 20;
}

export function deriveTeacherGradeClassrooms(darslar = []) {
  const map = new Map();
  for (const dars of darslar) {
    if (dars?.sinf?.id && !map.has(dars.sinf.id)) {
      map.set(dars.sinf.id, dars.sinf);
    }
  }
  return [...map.values()];
}
