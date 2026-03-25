export const BAHO_TURI_OPTIONS = ['ALL', 'JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
export const BAHO_TURI_LABEL_KEYS = {
  ALL: 'Hammasi',
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

export const STUDENT_GRADE_STATS_KEYS = ['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];

export function buildStudentGradesQuery({ sana, bahoTuri, page, limit }) {
  return {
    ...(sana ? { sana } : {}),
    ...(bahoTuri && bahoTuri !== 'ALL' ? { bahoTuri } : {}),
    page,
    limit,
  };
}

export function formatGradeTypeLabel(t, value) {
  return t(BAHO_TURI_LABEL_KEYS[value] || value, { defaultValue: value });
}

export function isStudentGradesFilterPristine({ sana, bahoTuri, limit }) {
  return !sana && bahoTuri === 'ALL' && Number(limit) === 20;
}
