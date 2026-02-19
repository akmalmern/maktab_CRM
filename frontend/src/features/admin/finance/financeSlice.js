import { createSlice } from '@reduxjs/toolkit';
import {
  fetchFinanceSettingsThunk,
  fetchFinanceStudentsThunk,
  updateFinanceSettingsThunk,
  rollbackFinanceTarifThunk,
  fetchFinanceStudentDetailThunk,
  createFinanceImtiyozThunk,
  deactivateFinanceImtiyozThunk,
} from './financeThunks';

const initialState = {
  settings: {
    oylikSumma: 0,
    yillikSumma: 0,
    faolTarifId: null,
  },
  settingsMeta: {
    constraints: {
      minSumma: 50000,
      maxSumma: 50000000,
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
      cashflowDiffAmount: 0,
    },
    tarifHistory: [],
    tarifAudit: [],
  },
  students: {
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    summary: {
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
      cashflow: {
        month: null,
        monthFormatted: '',
        planAmount: 0,
        collectedAmount: 0,
        debtAmount: 0,
        diffAmount: 0,
      },
      selectedMonth: null,
    },
    loading: false,
    error: null,
  },
  detail: {
    student: null,
    imtiyozlar: [],
    transactions: [],
    loading: false,
    error: null,
  },
};

const financeSlice = createSlice({
  name: 'adminFinance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinanceSettingsThunk.fulfilled, (state, action) => {
        state.settings = action.payload.settings || state.settings;
        state.settingsMeta.preview = action.payload.preview || state.settingsMeta.preview;
        state.settingsMeta.constraints = action.payload.constraints || state.settingsMeta.constraints;
        state.settingsMeta.tarifHistory = action.payload.tarifHistory || [];
        state.settingsMeta.tarifAudit = action.payload.tarifAudit || [];
      })
      .addCase(updateFinanceSettingsThunk.fulfilled, (state) => {
        state.detail.error = null;
      })
      .addCase(updateFinanceSettingsThunk.rejected, (state, action) => {
        state.detail.error = action.payload || "Tarif saqlanmadi";
      })
      .addCase(rollbackFinanceTarifThunk.fulfilled, (state) => {
        state.detail.error = null;
      })
      .addCase(rollbackFinanceTarifThunk.rejected, (state, action) => {
        state.detail.error = action.payload || "Rollback bajarilmadi";
      })
      .addCase(fetchFinanceStudentsThunk.pending, (state) => {
        state.students.loading = true;
        state.students.error = null;
      })
      .addCase(fetchFinanceStudentsThunk.fulfilled, (state, action) => {
        state.students.loading = false;
        state.students.items = action.payload.students || [];
        state.students.page = action.payload.page || 1;
        state.students.limit = action.payload.limit || 20;
        state.students.total = action.payload.total || 0;
        state.students.pages = action.payload.pages || 0;
        state.students.summary = action.payload.summary || state.students.summary;
        if (action.payload.settings) state.settings = action.payload.settings;
      })
      .addCase(fetchFinanceStudentsThunk.rejected, (state, action) => {
        state.students.loading = false;
        state.students.error = action.payload || "Moliya ro'yxati olinmadi";
      })
      .addCase(fetchFinanceStudentDetailThunk.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchFinanceStudentDetailThunk.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.student = action.payload.student || null;
        state.detail.imtiyozlar = action.payload.imtiyozlar || [];
        state.detail.transactions = action.payload.transactions || [];
      })
      .addCase(fetchFinanceStudentDetailThunk.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.payload || "Student to'lov detallari olinmadi";
      })
      .addCase(createFinanceImtiyozThunk.rejected, (state, action) => {
        state.detail.error = action.payload || "Imtiyoz saqlanmadi";
      })
      .addCase(deactivateFinanceImtiyozThunk.rejected, (state, action) => {
        state.detail.error = action.payload || "Imtiyoz bekor qilinmadi";
      });
  },
});

export default financeSlice.reducer;
