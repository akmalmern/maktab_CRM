import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, apiRequest, getErrorMessage } from '../../lib/apiClient';

function getToken(getState) {
  return getState().auth.accessToken;
}

export const fetchTeachersThunk = createAsyncThunk(
  'admin/fetchTeachers',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/teachers',
        token: getToken(getState),
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createTeacherThunk = createAsyncThunk(
  'admin/createTeacher',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/teachers',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createStudentThunk = createAsyncThunk(
  'admin/createStudent',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/students',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchStudentsThunk = createAsyncThunk(
  'admin/fetchStudents',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/students',
        token: getToken(getState),
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteTeacherThunk = createAsyncThunk(
  'admin/deleteTeacher',
  async (teacherId, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/teachers/${teacherId}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return teacherId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteStudentThunk = createAsyncThunk(
  'admin/deleteStudent',
  async (studentId, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/students/${studentId}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return studentId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchPersonDetailThunk = createAsyncThunk(
  'admin/fetchPersonDetail',
  async ({ type, id }, { getState, rejectWithValue }) => {
    try {
      const path = type === 'teacher' ? `/api/admin-detail/teachers/${id}` : `/api/admin-detail/students/${id}`;
      const data = await apiRequest({ path, token: getToken(getState) });
      return { type, id, data: type === 'teacher' ? data.teacher : data.student };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const uploadDocumentThunk = createAsyncThunk(
  'admin/uploadDocument',
  async ({ ownerType, ownerId, file, kind, title }, { getState, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (kind) formData.append('kind', kind);
      if (title) formData.append('title', title);

      if (ownerType === 'teacher') formData.append('teacherId', ownerId);
      if (ownerType === 'student') formData.append('studentId', ownerId);

      return await apiRequest({
        path: '/api/docs',
        method: 'POST',
        token: getToken(getState),
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
  async ({ id, kind, title }, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/docs/${id}`,
        method: 'PATCH',
        token: getToken(getState),
        body: { kind, title },
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteDocumentThunk = createAsyncThunk(
  'admin/deleteDocument',
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/docs/${id}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const uploadAvatarThunk = createAsyncThunk(
  'admin/uploadAvatar',
  async ({ userId, file }, { getState, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      return await apiRequest({
        path: '/api/avatars',
        method: 'POST',
        token: getToken(getState),
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
  async ({ userId }, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/avatars',
        method: 'DELETE',
        token: getToken(getState),
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
        url: `/api/docs/${id}/download`,
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

const initialListState = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  pages: 0,
  loading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    teachers: { ...initialListState },
    students: { ...initialListState },
    detail: {
      type: null,
      id: null,
      data: null,
      loading: false,
      error: null,
    },
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearActionError(state) {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachersThunk.pending, (state) => {
        state.teachers.loading = true;
        state.teachers.error = null;
      })
      .addCase(fetchTeachersThunk.fulfilled, (state, action) => {
        state.teachers.loading = false;
        state.teachers.items = action.payload.teachers || [];
        state.teachers.page = action.payload.page || 1;
        state.teachers.limit = action.payload.limit || 10;
        state.teachers.total = action.payload.total || 0;
        state.teachers.pages = action.payload.pages || 0;
      })
      .addCase(fetchTeachersThunk.rejected, (state, action) => {
        state.teachers.loading = false;
        state.teachers.error = action.payload || 'Teacherlar olinmadi';
      })

      .addCase(fetchStudentsThunk.pending, (state) => {
        state.students.loading = true;
        state.students.error = null;
      })
      .addCase(fetchStudentsThunk.fulfilled, (state, action) => {
        state.students.loading = false;
        state.students.items = action.payload.students || [];
        state.students.page = action.payload.page || 1;
        state.students.limit = action.payload.limit || 10;
        state.students.total = action.payload.total || 0;
        state.students.pages = action.payload.pages || 0;
      })
      .addCase(fetchStudentsThunk.rejected, (state, action) => {
        state.students.loading = false;
        state.students.error = action.payload || 'Studentlar olinmadi';
      })

      .addCase(fetchPersonDetailThunk.pending, (state) => {
        state.detail.loading = true;
        state.detail.error = null;
      })
      .addCase(fetchPersonDetailThunk.fulfilled, (state, action) => {
        state.detail.loading = false;
        state.detail.type = action.payload.type;
        state.detail.id = action.payload.id;
        state.detail.data = action.payload.data;
      })
      .addCase(fetchPersonDetailThunk.rejected, (state, action) => {
        state.detail.loading = false;
        state.detail.error = action.payload || 'Profil ma`lumoti olinmadi';
      })

      // Generic action loading handler for mutate operations.
      .addMatcher(
        (action) =>
          action.type.startsWith('admin/') &&
          action.type.endsWith('/pending') &&
          !action.type.includes('fetchTeachers') &&
          !action.type.includes('fetchStudents') &&
          !action.type.includes('fetchPersonDetail'),
        (state) => {
          state.actionLoading = true;
          state.actionError = null;
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith('admin/') &&
          action.type.endsWith('/fulfilled') &&
          !action.type.includes('fetchTeachers') &&
          !action.type.includes('fetchStudents') &&
          !action.type.includes('fetchPersonDetail'),
        (state) => {
          state.actionLoading = false;
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith('admin/') &&
          action.type.endsWith('/rejected') &&
          !action.type.includes('fetchTeachers') &&
          !action.type.includes('fetchStudents') &&
          !action.type.includes('fetchPersonDetail'),
        (state, action) => {
          state.actionLoading = false;
          state.actionError = action.payload || 'Amaliyot bajarilmadi';
        },
      );
  },
});

export const { clearActionError } = adminSlice.actions;
export default adminSlice.reducer;
