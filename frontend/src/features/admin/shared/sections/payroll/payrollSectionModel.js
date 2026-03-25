export function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

export function getCurrentMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function formatMoneyRaw(value, locale = 'uz-UZ') {
  const n = Number(value || 0);
  return new Intl.NumberFormat(locale).format(Number.isFinite(n) ? n : 0);
}

export function formatPersonLabel(person, fallback = '') {
  if (!person) return fallback;
  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  const username = person.user?.username || '';
  if (fullName && username) return `${fullName} (@${username})`;
  return fullName || (username ? `@${username}` : fallback);
}

export function buildOwnerKey({ teacherId, employeeId }) {
  if (teacherId) return `teacher:${teacherId}`;
  if (employeeId) return `employee:${employeeId}`;
  return '';
}

export function parseOwnerKey(ownerKey) {
  const value = String(ownerKey || '');
  if (value.startsWith('teacher:')) {
    const teacherId = value.slice('teacher:'.length).trim();
    return teacherId ? { teacherId } : {};
  }
  if (value.startsWith('employee:')) {
    const employeeId = value.slice('employee:'.length).trim();
    return employeeId ? { employeeId } : {};
  }
  return {};
}

export function formatOwnerName({ teacher, employee, fallbackName = '', fallbackId = '' }) {
  return (
    formatPersonLabel(teacher, '') ||
    formatPersonLabel(employee, '') ||
    fallbackName ||
    fallbackId ||
    '-'
  );
}

export function formatEmployeeConfigName(row) {
  const teacherName = `${row?.teacher?.firstName || ''} ${row?.teacher?.lastName || ''}`.trim();
  const employeeName = `${row?.firstName || ''} ${row?.lastName || ''}`.trim();
  const username = row?.user?.username ? `@${row.user.username}` : '';
  const base = teacherName || employeeName || row?.id || '-';
  return username ? `${base} (${username})` : base;
}

export function getPayrollStatusLabel(value, t) {
  const labels = {
    DRAFT: t('Loyiha'),
    APPROVED: t('Tasdiqlangan'),
    PAID: t("To'langan"),
    REVERSED: t('Bekor qilingan'),
    DONE: t('Bajarilgan'),
    CANCELED: t('Bekor qilingan'),
    REPLACED: t("Almashtirilgan"),
    LESSON: t('Dars'),
    FIXED_SALARY: t('Oklad'),
    ADVANCE_DEDUCTION: t('Avans ushlanma'),
    BONUS: t('Bonus'),
    PENALTY: t('Jarima'),
    MANUAL: t("Qo'lda"),
    LESSON_BASED: t("Dars asosida"),
    FIXED: t('Oklad'),
    MIXED: t('Dars + oklad'),
    MANUAL_ONLY: t("Faqat qo'lda"),
    ACTIVE: t('Faol'),
    INACTIVE: t('Nofaol'),
    ARCHIVED: t('Arxiv'),
    UNPAID: t("To'lanmagan"),
    PARTIAL: t("Qisman to'langan"),
    NOT_GENERATED: t('Hisoblanmagan'),
    TEACHER: t("O'qituvchi"),
    STAFF: t('Xodim'),
  };
  return labels[value] || value || '-';
}

export function getRateSourceLabel(value, t) {
  const labels = {
    TEACHER_RATE: t("O'qituvchi stavkasi"),
    SUBJECT_DEFAULT_RATE: t('Fan stavkasi'),
  };
  return labels[value] || value || '-';
}

export const DEFAULT_RUN_FILTERS = { page: 1, limit: 20, status: '', periodMonth: '' };
export const DEFAULT_LINE_FILTERS = { page: 1, limit: 20, ownerKey: '', type: '' };
export const RATES_PAGE_LIMIT = 100;
export const DEFAULT_EMPLOYEE_CONFIG_FILTERS = {
  page: 1,
  limit: 20,
  kind: 'TEACHER',
  payrollMode: '',
  employmentStatus: '',
  isPayrollEligible: '',
  search: '',
};

export function createRatesDataset() {
  return {
    rates: [],
    page: 0,
    pages: 1,
    total: 0,
    loading: false,
    error: null,
    partial: false,
  };
}

export function mergeRatesDatasetPage(prev, response, targetPage) {
  const incoming = response?.rates || [];
  const total = Number(response?.total || 0);
  const pages = Math.max(Number(response?.pages || 1), 1);
  const nextRates = targetPage <= 1
    ? incoming
    : [
        ...prev.rates,
        ...incoming.filter((row) => !prev.rates.some((existing) => existing.id === row.id)),
      ];
  return {
    rates: nextRates,
    page: targetPage,
    pages,
    total,
    loading: false,
    error: null,
    partial: nextRates.length < total,
  };
}

export function buildRatesDatasetQuery(dataset, { limit = RATES_PAGE_LIMIT } = {}) {
  return {
    data: {
      rates: dataset.rates,
      page: dataset.page,
      pages: dataset.pages,
      total: dataset.total,
      limit,
    },
    isLoading: dataset.loading && dataset.page <= 1,
    isFetching: dataset.loading,
    error: dataset.error ? { message: dataset.error } : null,
    partial: dataset.partial,
    hasMore: dataset.page < dataset.pages,
    loadingMore: dataset.loading && dataset.page > 0,
  };
}

export function buildSelectedRunTeacherRows({ selectedRun, teachers }) {
  if (!selectedRun) return [];
  const runItems = selectedRun.items || [];
  if (!teachers.length) return runItems;

  const itemByTeacherId = new Map(
    runItems
      .filter((item) => item.teacherId)
      .map((item) => [item.teacherId, item]),
  );
  const mappedTeacherIds = new Set();
  const rows = teachers.map((teacher) => {
    mappedTeacherIds.add(teacher.id);
    const existing = itemByTeacherId.get(teacher.id);
    if (existing) return existing;

    return {
      id: `placeholder:${teacher.id}`,
      teacherId: teacher.id,
      employeeId: teacher.employeeId || null,
      teacher,
      subjectBreakdown: teacher.subject?.name
        ? [{ subjectId: teacher.subject.id, subjectName: teacher.subject.name, ratePerHour: null }]
        : [],
      primaryRatePerHour: null,
      payableAmount: 0,
      paidAmount: 0,
      paymentStatus: 'NOT_GENERATED',
    };
  });

  for (const item of runItems) {
    if (item.teacherId && mappedTeacherIds.has(item.teacherId)) continue;
    rows.push(item);
  }
  return rows;
}

export function paginateRows(rows, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page || 1));
  const safeLimit = Math.max(1, Number(limit || 20));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const normalizedPage = Math.min(safePage, pages);
  const start = (normalizedPage - 1) * safeLimit;
  return {
    rows: rows.slice(start, start + safeLimit),
    page: normalizedPage,
    limit: safeLimit,
    pages,
    total,
  };
}
