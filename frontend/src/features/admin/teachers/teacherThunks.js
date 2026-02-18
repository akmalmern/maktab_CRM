import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchTeachersThunk = createAsyncThunk(
  'admin/fetchTeachers',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/teachers',
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createTeacherThunk = createAsyncThunk(
  'admin/createTeacher',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/teachers',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteTeacherThunk = createAsyncThunk(
  'admin/deleteTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/teachers/${teacherId}`,
        method: 'DELETE',
      });
      return teacherId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
