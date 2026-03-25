export const HOLAT_OPTIONS = ['KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ'];
export const HOLAT_LABEL_KEYS = {
  KELDI: 'Keldi',
  KECHIKDI: 'Kechikdi',
  SABABLI: 'Sababli',
  SABABSIZ: 'Sababsiz',
};

export const BAHO_TURI_OPTIONS = ['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
export const BAHO_TURI_LABEL_KEYS = {
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

export const PERIOD_OPTIONS = ['KUNLIK', 'HAFTALIK', 'OYLIK', 'CHORAKLIK', 'YILLIK'];
export const PERIOD_LABEL_KEYS = {
  KUNLIK: 'Kunlik',
  HAFTALIK: 'Haftalik',
  OYLIK: 'Oylik',
  CHORAKLIK: 'Choraklik',
  YILLIK: 'Yillik',
};

export const HISTORY_HOLAT_SHORTCUTS = ['ALL', 'SABABSIZ', 'KECHIKDI', 'SABABLI'];
export const FIELD_LABEL_CLASS = 'text-xs font-medium uppercase tracking-wide text-slate-500';
export const FIELD_WRAP_CLASS = 'space-y-1.5';

export function holatLabel(t, value) {
  return t(HOLAT_LABEL_KEYS[value] || value, { defaultValue: value });
}

export function bahoTuriLabel(t, value) {
  return t(BAHO_TURI_LABEL_KEYS[value] || value, { defaultValue: value });
}

export function normalizeTeacherAttendanceDetail(data) {
  return {
    ...data,
    students: (data?.students || []).map((student) => ({
      ...student,
      holat: student.holat || 'KELDI',
      bahoBall: student.bahoBall ?? '',
      bahoMaxBall: student.bahoMaxBall ?? 5,
      bahoTuri: student.bahoTuri || 'JORIY',
    })),
  };
}

export function buildTeacherAttendanceSavePayload({ sana, students = [] }) {
  return {
    sana,
    davomatlar: students.map((student) => ({
      studentId: student.id,
      holat: student.holat,
      ...(student.bahoBall === null
        ? {
            bahoBall: null,
            bahoTuri: student.bahoTuri || 'JORIY',
          }
        : student.bahoBall !== '' && student.bahoBall !== undefined
          ? {
              bahoBall: Number(student.bahoBall),
              bahoMaxBall: Number(student.bahoMaxBall || 5),
              bahoTuri: student.bahoTuri || 'JORIY',
            }
          : {}),
    })),
  };
}

export function formatTeacherAttendanceDarsLabel(dars) {
  return `${dars?.sinf?.name || '-'} - ${dars?.fan?.name || '-'} (${dars?.vaqtOraliq?.boshlanishVaqti || '-'})`;
}
