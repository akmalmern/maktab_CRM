export const DEFAULT_FINANCE_QUERY = {
  search: '',
  page: 1,
  limit: 20,
  status: 'ALL',
  classroomId: 'all',
  debtMonth: 'ALL',
  debtTargetMonth: '',
  cashflowMonth: '',
};

const FINANCE_STATUS_SET = new Set(['ALL', 'QARZDOR', 'TOLAGAN']);
const FINANCE_DEBT_MONTH_SET = new Set(['ALL', 'CURRENT', 'PREVIOUS']);

export function normalizeFinanceMonthKey(value) {
  if (!value) return '';
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value)) ? String(value) : '';
}

export function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeFinanceQuery(next = {}) {
  return {
    search: String(next.search || '').trimStart(),
    page: parsePositiveInt(next.page, 1),
    limit: parsePositiveInt(next.limit, 20),
    status: FINANCE_STATUS_SET.has(next.status) ? next.status : 'ALL',
    classroomId: next.classroomId && next.classroomId !== 'all' ? String(next.classroomId) : 'all',
    debtMonth: FINANCE_DEBT_MONTH_SET.has(next.debtMonth) ? next.debtMonth : 'ALL',
    debtTargetMonth: normalizeFinanceMonthKey(next.debtTargetMonth),
    cashflowMonth: normalizeFinanceMonthKey(next.cashflowMonth),
  };
}

export function readFinanceQueryFromSearchParams(searchParams) {
  return normalizeFinanceQuery({
    search: searchParams.get('search') || '',
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 20,
    status: searchParams.get('status') || 'ALL',
    classroomId: searchParams.get('classroomId') || 'all',
    debtMonth: searchParams.get('debtMonth') || 'ALL',
    debtTargetMonth: searchParams.get('debtTargetMonth') || '',
    cashflowMonth: searchParams.get('cashflowMonth') || '',
  });
}

export function syncFinanceSearchParams(currentSearchParams, nextQuery) {
  const params = new URLSearchParams(currentSearchParams);
  const setOrDelete = (key, value, defaultValue = '') => {
    if (value === undefined || value === null || value === '' || value === defaultValue) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  };
  setOrDelete('search', nextQuery.search, '');
  setOrDelete('page', nextQuery.page, 1);
  setOrDelete('limit', nextQuery.limit, 20);
  setOrDelete('status', nextQuery.status, 'ALL');
  setOrDelete('classroomId', nextQuery.classroomId, 'all');
  setOrDelete('debtMonth', nextQuery.debtMonth, 'ALL');
  setOrDelete('debtTargetMonth', nextQuery.debtTargetMonth, '');
  setOrDelete('cashflowMonth', nextQuery.cashflowMonth, '');
  return params;
}

export function isSameFinanceQuery(a, b) {
  return (
    a.search === b.search &&
    Number(a.page) === Number(b.page) &&
    Number(a.limit) === Number(b.limit) &&
    a.status === b.status &&
    a.classroomId === b.classroomId &&
    a.debtMonth === b.debtMonth &&
    a.debtTargetMonth === b.debtTargetMonth &&
    a.cashflowMonth === b.cashflowMonth
  );
}
