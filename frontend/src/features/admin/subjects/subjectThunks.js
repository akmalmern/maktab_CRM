import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchSubjectsThunk = createAsyncThunk(
  'admin/fetchSubjects',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/subjects',
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createSubjectThunk = createAsyncThunk(
  'admin/createSubject',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/subjects',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteSubjectThunk = createAsyncThunk(
  'admin/deleteSubject',
  async (subjectId, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/subjects/${subjectId}`,
        method: 'DELETE',
      });
      return subjectId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
