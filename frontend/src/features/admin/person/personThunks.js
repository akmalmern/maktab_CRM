import { createAsyncThunk } from '@reduxjs/toolkit';
import { api, apiRequest, getErrorMessage } from '../../../lib/apiClient';

export const fetchPersonDetailThunk = createAsyncThunk(
  'admin/fetchPersonDetail',
  async ({ type, id }, { rejectWithValue }) => {
    try {
      const path =
        type === 'teacher' ? `/api/admin/details/teachers/${id}` : `/api/admin/details/students/${id}`;
      const data = await apiRequest({ path });
      return { type, id, data: type === 'teacher' ? data.teacher : data.student };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const uploadDocumentThunk = createAsyncThunk(
  'admin/uploadDocument',
  async ({ ownerType, ownerId, file, kind, title }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (kind) formData.append('kind', kind);
      if (title) formData.append('title', title);
      if (ownerType === 'teacher') formData.append('teacherId', ownerId);
      if (ownerType === 'student') formData.append('studentId', ownerId);

      return await apiRequest({
        path: '/api/admin/docs',
        method: 'POST',
        body: formData,
        isFormData: true,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateDocumentThunk = createAsyncThunk(
  'admin/updateDocument',
  async ({ id, kind, title }, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/admin/docs/${id}`,
        method: 'PATCH',
        body: { kind, title },
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteDocumentThunk = createAsyncThunk(
  'admin/deleteDocument',
  async (id, { rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/docs/${id}`,
        method: 'DELETE',
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const uploadAvatarThunk = createAsyncThunk(
  'admin/uploadAvatar',
  async ({ userId, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      return await apiRequest({
        path: '/api/admin/avatars',
        method: 'POST',
        body: formData,
        isFormData: true,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteAvatarThunk = createAsyncThunk(
  'admin/deleteAvatar',
  async ({ userId }, { rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/avatars',
        method: 'DELETE',
        body: { userId },
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const downloadDocumentThunk = createAsyncThunk(
  'admin/downloadDocument',
  async ({ id, fileName }, { rejectWithValue }) => {
    try {
      const response = await api.request({
        url: `/api/admin/docs/${id}/download`,
        method: 'GET',
        responseType: 'blob',
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { id };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const resetPersonPasswordThunk = createAsyncThunk(
  'admin/resetPersonPassword',
  async ({ type, id, newPassword }, { rejectWithValue }) => {
    try {
      const path =
        type === 'teacher'
          ? `/api/admin/details/teachers/${id}/reset-password`
          : `/api/admin/details/students/${id}/reset-password`;
      return await apiRequest({
        path,
        method: 'POST',
        body: { newPassword },
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);
