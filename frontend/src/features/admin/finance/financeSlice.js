import { createSlice } from '@reduxjs/toolkit';
import {
  fetchFinanceSettingsThunk,
  fetchFinanceStudentsThunk,
  fetchFinanceStudentDetailThunk,
} from './financeThunks';

const initialState = {
  settings: {
    oylikSumma: 0,
    yillikSumma: 0,
  },
  students: {
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    loading: false,
    error: null,
  },
  detail: {
    student: null,
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
        state.detail.transactions = action.payload.transactions || [];
      })
      .addCase(fetchFinanceStudentDetailThunk.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.payload || "Student to'lov detallari olinmadi";
      });
  },
});

export default financeSlice.reducer;
