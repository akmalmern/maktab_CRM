export function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

export function formatNumberByLocale(value, locale = 'uz-UZ', options = {}) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);

  return options.replaceCommas ? formatted.replace(/,/g, ' ') : formatted;
}

export function currentMonthKey(referenceDate = new Date()) {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
}

export function createClientRequestKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function toMonthNumber(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return year * 12 + month;
}

export function fromMonthNumber(value) {
  const year = Math.floor((value - 1) / 12);
  const month = value - year * 12;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function buildMonthRange(startMonth, count) {
  const startValue = toMonthNumber(startMonth);
  const limit = Number(count || 0);
  if (!startValue || !Number.isFinite(limit) || limit < 1) return [];
  return Array.from({ length: limit }, (_, idx) => fromMonthNumber(startValue + idx));
}

export function formatMonthKey(value, locale = 'uz-UZ') {
  const [yearStr, monthStr] = String(value || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return value || '-';
  }
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function monthKeyToDateInputValue(monthKey, fallbackMonthKey = currentMonthKey()) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${fallbackMonthKey}-01`;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function dateInputValueToMonthKey(dateValue, fallbackMonthKey = currentMonthKey()) {
  const [yearStr, monthStr] = String(dateValue || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return fallbackMonthKey;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatDateTime(value, locale = 'uz-UZ') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale);
}

export function formatDate(value, locale = 'uz-UZ') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale);
}
