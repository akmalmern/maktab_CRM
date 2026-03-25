export const PERIOD_OPTIONS = ['KUNLIK', 'HAFTALIK', 'OYLIK', 'CHORAKLIK', 'YILLIK'];
export const PERIOD_LABEL_KEYS = {
  KUNLIK: 'Kunlik',
  HAFTALIK: 'Haftalik',
  OYLIK: 'Oylik',
  CHORAKLIK: 'Choraklik',
  YILLIK: 'Yillik',
};

export const HOLAT_OPTIONS = ['ALL', 'KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ'];
export const HOLAT_LABEL_KEYS = {
  ALL: 'Barcha holatlar',
  KELDI: 'Keldi',
  KECHIKDI: 'Kechikdi',
  SABABLI: 'Sababli',
  SABABSIZ: 'Sababsiz',
};

export const STUDENT_ATTENDANCE_STATUS_CARDS = [
  ['Keldi', 'KELDI', 'bg-emerald-50 border-emerald-200 text-emerald-800'],
  ['Kechikdi', 'KECHIKDI', 'bg-amber-50 border-amber-200 text-amber-800'],
  ['Sababli', 'SABABLI', 'bg-sky-50 border-sky-200 text-sky-800'],
  ['Sababsiz', 'SABABSIZ', 'bg-rose-50 border-rose-200 text-rose-800'],
];

export function holatLabel(t, value) {
  return t(HOLAT_LABEL_KEYS[value] || value, { defaultValue: value });
}

export function bahoTuriLabel(t, value) {
  if (!value) return '-';
  const map = {
    JORIY: 'Joriy',
    NAZORAT: 'Nazorat',
    ORALIQ: 'Oraliq',
    YAKUNIY: 'Yakuniy',
  };
  return t(map[value] || value, { defaultValue: value });
}

export function buildStudentAttendanceQuery({
  sana,
  periodType,
  holat,
  page,
  limit,
}) {
  return {
    sana,
    periodType,
    ...(holat && holat !== 'ALL' ? { holat } : {}),
    page,
    limit,
  };
}

export function formatStudentAttendanceBaho(row) {
  return row?.bahoBall !== null && row?.bahoBall !== undefined && row?.bahoMaxBall
    ? `${row.bahoBall}/${row.bahoMaxBall}`
    : '-';
}
