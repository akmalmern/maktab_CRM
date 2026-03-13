function normalizeLang(language) {
  const code = String(language || 'uz').toLowerCase();
  if (code.startsWith('ru')) return 'ru';
  if (code.startsWith('en')) return 'en';
  return 'uz';
}

function matchPeriodNumber(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const m = value.match(/^(\d+)\s*[-.]?\s*(?:para|soat|urok|\u0443\u0440\u043e\u043a|lesson|period)?$/iu);
  return m ? Number.parseInt(m[1], 10) : null;
}

export function formatScheduleSlotLabel(rawName, language) {
  const periodNumber = matchPeriodNumber(rawName);
  if (!periodNumber) return String(rawName || '');

  const lang = normalizeLang(language);
  if (lang === 'ru') return `${periodNumber}-\u0443\u0440\u043e\u043a`;
  if (lang === 'en') return `Period ${periodNumber}`;
  return `${periodNumber}-soat`;
}
