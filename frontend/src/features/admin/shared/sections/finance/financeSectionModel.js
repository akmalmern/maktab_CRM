export const BILLING_MONTH_OPTIONS = [9, 10, 11, 12];
export const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

export function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

export function sumFormat(value, locale = 'uz-UZ') {
  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

export function todayMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function createClientRequestKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function monthNameByNumber(monthNo, locale = 'uz-UZ') {
  if (!Number.isFinite(monthNo) || monthNo < 1 || monthNo > 12) return '';
  return new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, monthNo - 1, 1)),
  );
}

export function formatMonthKey(value, locale = 'uz-UZ') {
  const parts = String(value || '').split('-');
  if (parts.length !== 2) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value;
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function normalizeBillingMonths(value, fallback = 10) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  if (intVal < 1 || intVal > 12) return fallback;
  return intVal;
}

export function sortSchoolMonths(months = []) {
  const monthSet = new Set(months.map((m) => Number(m)).filter((m) => Number.isFinite(m) && m >= 1 && m <= 12));
  return SCHOOL_MONTH_ORDER.filter((m) => monthSet.has(m));
}

export function normalizeChargeableMonths(value, fallbackCount = 10) {
  const fromValue = Array.isArray(value) ? sortSchoolMonths(value) : [];
  if (fromValue.length) return fromValue;
  return SCHOOL_MONTH_ORDER.slice(0, normalizeBillingMonths(fallbackCount, 10));
}

export function sameNumberArray(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Number(a[i]) !== Number(b[i])) return false;
  }
  return true;
}

export function deriveYearlySumma(oylikSumma, tolovOylarSoni = 10) {
  return Number(oylikSumma || 0) * normalizeBillingMonths(tolovOylarSoni);
}

export function getCurrentAcademicYearLabel() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

export function isValidAcademicYearLabel(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

export function buildAcademicYearOptions(classrooms = [], selectedAcademicYear) {
  const set = new Set();
  const current = getCurrentAcademicYearLabel();
  const [currentStart] = current.split('-').map(Number);
  [current, `${currentStart + 1}-${currentStart + 2}`, `${currentStart - 1}-${currentStart}`].forEach((v) =>
    set.add(v),
  );
  classrooms.forEach((c) => {
    if (isValidAcademicYearLabel(c?.academicYear)) set.add(c.academicYear);
  });
  if (isValidAcademicYearLabel(selectedAcademicYear)) set.add(selectedAcademicYear);
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function monthKeyToDateInputValue(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${todayMonth()}-01`;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function dateInputValueToMonthKey(dateValue) {
  const [yearStr, monthStr] = String(dateValue || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return todayMonth();
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function paymentTypeLabel(type, t) {
  if (type === 'YILLIK') return t('Yillik');
  if (type === 'IXTIYORIY') return t('Ixtiyoriy');
  return t('Oylik');
}

export function imtiyozTypeLabel(type, t) {
  if (type === 'FOIZ') return t('Foiz');
  if (type === 'SUMMA') return t('Summa');
  if (type === 'TOLIQ_OZOD') return t("To'liq ozod");
  return type || '-';
}

export function formatDateTimeLocale(value, locale = 'uz-UZ') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale);
}

export function createDefaultPaymentForm() {
  return {
    turi: 'OYLIK',
    startMonth: todayMonth(),
    oylarSoni: 1,
    summa: '',
    izoh: '',
  };
}

export function createDefaultImtiyozForm() {
  return {
    turi: 'FOIZ',
    qiymat: '',
    boshlanishOy: todayMonth(),
    oylarSoni: 1,
    sabab: '',
    izoh: '',
  };
}

export function createDefaultSettingsDraft() {
  return {
    oylikSumma: '',
    billingAcademicYear: '',
    billingChargeableMonths: null,
    izoh: '',
  };
}

export function buildPaymentPayloadFromForm(paymentForm, paymentRequestKey) {
  const payload = {
    turi: paymentForm.turi,
    startMonth: paymentForm.startMonth,
    izoh: paymentForm.izoh || undefined,
  };
  payload.oylarSoni = paymentForm.turi === 'YILLIK' ? 12 : Number(paymentForm.oylarSoni || 1);
  if (paymentForm.summa !== '') payload.summa = Number(paymentForm.summa);
  if (paymentRequestKey) payload.idempotencyKey = paymentRequestKey;
  return payload;
}

export function buildFinanceSettingsValidation({
  settingsDraft,
  settings,
  settingsMeta,
  t,
  locale,
}) {
  const minSumma = Number(settingsMeta?.constraints?.minSumma || 50000);
  const maxSumma = Number(settingsMeta?.constraints?.maxSumma || 50000000);
  const currentBillingMonths = normalizeBillingMonths(
    settings?.tolovOylarSoni ??
      Math.round(Number(settings?.yillikSumma || 0) / Math.max(Number(settings?.oylikSumma || 1), 1)),
    10,
  );
  const currentChargeableMonths = normalizeChargeableMonths(
    settings?.billingCalendar?.chargeableMonths,
    currentBillingMonths,
  );
  const currentAcademicYear = isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
    ? settings.billingCalendar.academicYear
    : getCurrentAcademicYearLabel();
  const oylik = settingsDraft.oylikSumma === '' ? Number(settings?.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
  const billingAcademicYear = isValidAcademicYearLabel(settingsDraft.billingAcademicYear)
    ? settingsDraft.billingAcademicYear
    : currentAcademicYear;
  const billingChargeableMonths = Array.isArray(settingsDraft.billingChargeableMonths)
    ? normalizeChargeableMonths(settingsDraft.billingChargeableMonths, currentBillingMonths)
    : currentChargeableMonths;
  const tolovOylarSoni = billingChargeableMonths.length;
  const yillik = deriveYearlySumma(oylik, tolovOylarSoni);
  const errors = {};

  if (!Number.isFinite(oylik) || oylik < minSumma || oylik > maxSumma) {
    errors.oylikSumma = t("Oylik summa {{min}} - {{max}} oralig'ida bo'lishi kerak", {
      min: sumFormat(minSumma, locale),
      max: sumFormat(maxSumma, locale),
    });
  }
  if (!Number.isFinite(tolovOylarSoni) || tolovOylarSoni < 1 || tolovOylarSoni > 12) {
    errors.tolovOylarSoni = t("To'lov olinadigan oylar soni 1-12 oralig'ida bo'lishi kerak");
  }
  if (!Number.isFinite(yillik) || yillik < minSumma || yillik > maxSumma) {
    errors.yillikSumma = t("Yillik summa {{min}} - {{max}} oralig'ida bo'lishi kerak", {
      min: sumFormat(minSumma, locale),
      max: sumFormat(maxSumma, locale),
    });
  }

  const changed =
    settingsDraft.oylikSumma !== '' ||
    (settingsDraft.billingAcademicYear !== '' && billingAcademicYear !== currentAcademicYear) ||
    (Array.isArray(settingsDraft.billingChargeableMonths) &&
      !sameNumberArray(billingChargeableMonths, currentChargeableMonths)) ||
    Boolean(settingsDraft.izoh);

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    changed,
    computed: {
      oylik,
      yillik,
      tolovOylarSoni,
      billingAcademicYear,
      billingChargeableMonths,
      vacationMonths: SCHOOL_MONTH_ORDER.filter((month) => !billingChargeableMonths.includes(month)),
    },
  };
}

export function buildFinanceStatusPanel({
  studentsSummary,
  studentsState,
  settings,
  t,
  locale,
}) {
  const totalRows = Number(studentsSummary?.totalRows || 0);
  const qarzdorlarSoni = Number(studentsSummary?.totalDebtors || 0);
  const jamiQarz = Number(studentsSummary?.totalDebtAmount || 0);
  const buOyTolangan = Number(studentsSummary?.thisMonthPaidAmount || 0);
  const buOyQarz = Number(studentsSummary?.thisMonthDebtAmount || 0);
  const buOyOylikChiqimi = Number(studentsSummary?.cashflow?.payrollPayoutAmount || 0);
  const buOySofOqim = Number(studentsSummary?.cashflow?.netAmount || 0);
  const tarifOylik = Number(studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0);
  const tarifYillik = Number(studentsSummary?.tarifYillikSumma || settings?.yillikSumma || 0);
  const tarifOylarSoni = normalizeBillingMonths(
    studentsSummary?.tarifTolovOylarSoni ?? settings?.tolovOylarSoni,
    10,
  );

  return [
    { label: t("Jami o'quvchilar soni"), value: totalRows },
    { label: t("Qarzdor o'quvchilar soni"), value: qarzdorlarSoni },
    { label: t('Umumiy qarzdorlik summasi'), value: sumFormat(jamiQarz, locale) },
    { label: t("Shu oy tushgan to'lovlar"), value: `${sumFormat(buOyTolangan, locale)} ${t("so'm")}` },
    { label: t("Shu oy yopilmagan qarz"), value: `${sumFormat(buOyQarz, locale)} ${t("so'm")}` },
    { label: t("Shu oy oylik chiqimi"), value: `${sumFormat(buOyOylikChiqimi, locale)} ${t("so'm")}` },
    { label: t("Shu oy sof pul oqimi"), value: `${sumFormat(buOySofOqim, locale)} ${t("so'm")}` },
    {
      label: `${t("Amaldagi tarif (oylik / yillik)")} (${tarifOylarSoni} ${t('oy')})`,
      value: `${sumFormat(tarifOylik, locale)} / ${sumFormat(tarifYillik, locale)}`,
    },
    {
      label: `${t('Sahifa')}: ${studentsState.page}/${studentsState.pages || 1}`,
      value: `${t('Yozuvlar')}: ${studentsState.limit || 20}`,
    },
  ];
}

export function buildFinanceCashflowPanel({ studentsSummary, locale }) {
  const flow = studentsSummary?.cashflow || {};
  return {
    month: flow.month ? formatMonthKey(flow.month, locale) : formatMonthKey(todayMonth(), locale),
    planAmount: Number(flow.planAmount || 0),
    collectedAmount: Number(flow.collectedAmount || 0),
    debtAmount: Number(flow.debtAmount || 0),
    diffAmount: Number(flow.diffAmount || 0),
    payrollPayoutAmount: Number(flow.payrollPayoutAmount || 0),
    payrollReversalAmount: Number(flow.payrollReversalAmount || 0),
    payrollNetAmount: Number(flow.payrollNetAmount || 0),
    netAmount: Number(flow.netAmount || 0),
  };
}
