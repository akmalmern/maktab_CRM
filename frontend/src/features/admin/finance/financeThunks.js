import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchFinanceSettingsThunk = createAsyncThunk(
  'admin/fetchFinanceSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest({ path: '/api/admin/moliya/settings' });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateFinanceSettingsThunk = createAsyncThunk(
  'admin/updateFinanceSettings',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/moliya/settings',
        method: 'PATCH',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchFinanceStudentsThunk = createAsyncThunk(
  'admin/fetchFinanceStudents',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/moliya/students',
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchFinanceStudentDetailThunk = createAsyncThunk(
  'admin/fetchFinanceStudentDetail',
  async (studentId, { rejectWithValue }) => {
    try {
      return await apiRequest({ path: `/api/admin/moliya/students/${studentId}` });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createFinancePaymentThunk = createAsyncThunk(
  'admin/createFinancePayment',
  async ({ studentId, payload }, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/admin/moliya/students/${studentId}/tolov`,
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const revertFinancePaymentThunk = createAsyncThunk(
  'admin/revertFinancePayment',
  async (tolovId, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/admin/moliya/tolov/${tolovId}`,
        method: 'DELETE',
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
