import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchStudentsThunk = createAsyncThunk(
  'admin/fetchStudents',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/students',
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createStudentThunk = createAsyncThunk(
  'admin/createStudent',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/students',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteStudentThunk = createAsyncThunk(
  'admin/deleteStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/students/${studentId}`,
        method: 'DELETE',
      });
      return studentId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
