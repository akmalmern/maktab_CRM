import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchClassroomsThunk = createAsyncThunk(
  'admin/fetchClassrooms',
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/classrooms',
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createClassroomThunk = createAsyncThunk(
  'admin/createClassroom',
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/classrooms',
        method: 'POST',
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteClassroomThunk = createAsyncThunk(
  'admin/deleteClassroom',
  async (classroomId, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/classrooms/${classroomId}`,
        method: 'DELETE',
      });
      return classroomId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
