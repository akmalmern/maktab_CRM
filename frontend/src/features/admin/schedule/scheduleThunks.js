import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchVaqtOraliqlariThunk = createAsyncThunk(
  'admin/fetchVaqtOraliqlari',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/vaqt-oraliqlari',
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createVaqtOraliqThunk = createAsyncThunk(
  'admin/createVaqtOraliq',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/vaqt-oraliqlari',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteVaqtOraliqThunk = createAsyncThunk(
  'admin/deleteVaqtOraliq',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/vaqt-oraliqlari/${id}`,
        method: 'DELETE',
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchDarsJadvaliThunk = createAsyncThunk(
  'admin/fetchDarsJadvali',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/dars-jadval',
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createDarsJadvaliThunk = createAsyncThunk(
  'admin/createDarsJadvali',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/dars-jadval',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteDarsJadvaliThunk = createAsyncThunk(
  'admin/deleteDarsJadvali',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'DELETE',
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateDarsJadvaliThunk = createAsyncThunk(
  'admin/updateDarsJadvali',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'PATCH',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
