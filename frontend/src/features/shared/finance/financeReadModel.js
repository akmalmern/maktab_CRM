export const FINANCE_SETTINGS_FALLBACK = {
  oylikSumma: 0,
  yillikSumma: 0,
  tolovOylarSoni: 10,
  billingCalendar: null,
  faolTarifId: null,
};

export const FINANCE_META_FALLBACK = {
  constraints: {
    minSumma: 50000,
    maxSumma: 50000000,
    billingMonthsOptions: [9, 10, 11, 12],
  },
  preview: {
    studentCount: 0,
    debtorCount: 0,
    tolayotganlar: 0,
    expectedMonthly: 0,
    expectedYearly: 0,
    gapMonthly: 0,
    gapYearly: 0,
    thisMonthPaidAmount: 0,
    thisYearPaidAmount: 0,
    thisMonthPayrollPayoutAmount: 0,
    thisMonthPayrollNetAmount: 0,
    thisMonthNetCashflowAmount: 0,
    cashflowDiffAmount: 0,
  },
  tarifHistory: [],
  tarifAudit: [],
};

export const FINANCE_SUMMARY_FALLBACK = {
  totalRows: 0,
  totalDebtors: 0,
  totalDebtAmount: 0,
  thisMonthDebtors: 0,
  previousMonthDebtors: 0,
  selectedMonthDebtors: 0,
  thisMonthDebtAmount: 0,
  previousMonthDebtAmount: 0,
  selectedMonthDebtAmount: 0,
  thisMonthPaidAmount: 0,
  thisYearPaidAmount: 0,
  monthlyPlanAmount: 0,
  yearlyPlanAmount: 0,
  tarifOylikSumma: 0,
  tarifYillikSumma: 0,
  tarifTolovOylarSoni: 10,
  cashflow: {
    month: null,
    monthFormatted: '',
    planAmount: 0,
    collectedAmount: 0,
    payrollPayoutAmount: 0,
    payrollReversalAmount: 0,
    payrollNetAmount: 0,
    netAmount: 0,
    debtAmount: 0,
    diffAmount: 0,
  },
  selectedMonth: null,
};

export function normalizeClassroomList(data) {
  return Array.isArray(data?.classrooms) ? data.classrooms : [];
}

export function normalizeAdminFinanceSettings(data) {
  const settings = data?.settings || {};

  return {
    settings: {
      ...FINANCE_SETTINGS_FALLBACK,
      ...settings,
      billingCalendar: settings?.billingCalendar || null,
    },
    meta: {
      constraints: data?.constraints || FINANCE_META_FALLBACK.constraints,
      preview: data?.preview || FINANCE_META_FALLBACK.preview,
      tarifHistory: Array.isArray(data?.tarifHistory) ? data.tarifHistory : FINANCE_META_FALLBACK.tarifHistory,
      tarifAudit: Array.isArray(data?.tarifAudit) ? data.tarifAudit : FINANCE_META_FALLBACK.tarifAudit,
    },
  };
}

export function normalizeAdminFinanceStudentsState({
  data,
  loading = false,
  error = null,
  fallbackLimit = 20,
}) {
  const summary = data?.summary || {};

  return {
    items: Array.isArray(data?.students) ? data.students : [],
    page: Number(data?.page || 1),
    limit: Number(data?.limit || fallbackLimit),
    total: Number(data?.total || 0),
    pages: Number(data?.pages || 0),
    summary: {
      ...FINANCE_SUMMARY_FALLBACK,
      ...summary,
      cashflow: {
        ...FINANCE_SUMMARY_FALLBACK.cashflow,
        ...(summary?.cashflow || {}),
      },
    },
    loading: Boolean(loading),
    error: error?.message || null,
  };
}

export function normalizeFinanceStudentDetailState({
  data,
  loading = false,
  error = null,
}) {
  return {
    student: data?.student || null,
    majburiyatlar: Array.isArray(data?.majburiyatlar) ? data.majburiyatlar : [],
    imtiyozlar: Array.isArray(data?.imtiyozlar) ? data.imtiyozlar : [],
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    loading: Boolean(loading),
    error: error?.message || null,
  };
}

export function createManagerStudentsState() {
  return {
    loading: true,
    error: '',
    items: [],
    total: 0,
    pages: 0,
    summary: {
      totalDebtors: 0,
      totalDebtAmount: 0,
    },
  };
}

export function normalizeManagerStudentsState({
  data,
  loading = false,
  error = null,
}) {
  return {
    loading: Boolean(loading),
    error: error?.message || '',
    items: Array.isArray(data?.students) ? data.students : [],
    total: Number(data?.total || 0),
    pages: Number(data?.pages || 0),
    summary: {
      totalDebtors: Number(data?.summary?.totalDebtors || 0),
      totalDebtAmount: Number(data?.summary?.totalDebtAmount || 0),
    },
  };
}

export function createManagerGlobalSummaryState() {
  return {
    loading: true,
    error: '',
    totalDebtors: 0,
    totalDebtAmount: 0,
  };
}

export function normalizeManagerGlobalSummaryState({
  data,
  loading = false,
  error = null,
}) {
  return {
    loading: Boolean(loading),
    error: error?.message || '',
    totalDebtors: Number(data?.summary?.totalDebtors || 0),
    totalDebtAmount: Number(data?.summary?.totalDebtAmount || 0),
  };
}

export function buildManagerDebtorSummaryCards({
  globalSummaryState,
  selectedTotal = 0,
  selectedRecordsLabel,
  locale,
  t,
  formatMoney,
}) {
  return [
    {
      label: `${t('Jami qarzdorlar')} (${t('umumiy')})`,
      value: globalSummaryState.loading ? '...' : Number(globalSummaryState.totalDebtors || 0),
    },
    {
      label: `${t("Jami qarz summasi")} (${t('umumiy')})`,
      value: globalSummaryState.loading
        ? '...'
        : formatMoney(globalSummaryState.totalDebtAmount || 0, locale, t),
    },
    {
      label: selectedRecordsLabel,
      value: Number(selectedTotal || 0),
    },
  ];
}

export function createManagerNotesState() {
  return {
    loading: false,
    error: '',
    items: [],
    page: 1,
    pages: 0,
    total: 0,
  };
}

export function normalizeManagerNotesState({
  data,
  loading = false,
  error = null,
  errorMessage = '',
}) {
  return {
    loading: Boolean(loading),
    error: error?.message || errorMessage || '',
    items: Array.isArray(data?.notes) ? data.notes : [],
    page: Number(data?.page || 1),
    pages: Number(data?.pages || 0),
    total: Number(data?.total || 0),
  };
}

export function createManagerPaymentState() {
  return {
    loading: false,
    error: '',
    student: null,
    transactions: [],
    imtiyozlar: [],
    majburiyatlar: [],
  };
}

export function normalizeManagerPaymentState({
  data,
  loading = false,
  error = null,
  errorMessage = '',
}) {
  return {
    loading: Boolean(loading),
    error: error?.message || errorMessage || '',
    student: data?.student || null,
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
    imtiyozlar: Array.isArray(data?.imtiyozlar) ? data.imtiyozlar : [],
    majburiyatlar: Array.isArray(data?.majburiyatlar) ? data.majburiyatlar : [],
  };
}
