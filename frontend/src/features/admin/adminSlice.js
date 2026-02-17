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

export const fetchSubjectsThunk = createAsyncThunk(
  'admin/fetchSubjects',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/subjects',
        token: getToken(getState),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchClassroomsThunk = createAsyncThunk(
  'admin/fetchClassrooms',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/classrooms',
        token: getToken(getState),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createSubjectThunk = createAsyncThunk(
  'admin/createSubject',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/subjects',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteSubjectThunk = createAsyncThunk(
  'admin/deleteSubject',
  async (subjectId, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/subjects/${subjectId}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return subjectId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createClassroomThunk = createAsyncThunk(
  'admin/createClassroom',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/classrooms',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteClassroomThunk = createAsyncThunk(
  'admin/deleteClassroom',
  async (classroomId, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/classrooms/${classroomId}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return classroomId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchVaqtOraliqlariThunk = createAsyncThunk(
  'admin/fetchVaqtOraliqlari',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/vaqt-oraliqlari',
        token: getToken(getState),
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createVaqtOraliqThunk = createAsyncThunk(
  'admin/createVaqtOraliq',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/vaqt-oraliqlari',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteVaqtOraliqThunk = createAsyncThunk(
  'admin/deleteVaqtOraliq',
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/vaqt-oraliqlari/${id}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const fetchDarsJadvaliThunk = createAsyncThunk(
  'admin/fetchDarsJadvali',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/dars-jadval',
        token: getToken(getState),
        query: params,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createDarsJadvaliThunk = createAsyncThunk(
  'admin/createDarsJadvali',
  async (payload, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: '/api/admin/dars-jadval',
        method: 'POST',
        token: getToken(getState),
        body: payload,
      });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteDarsJadvaliThunk = createAsyncThunk(
  'admin/deleteDarsJadvali',
  async (id, { getState, rejectWithValue }) => {
    try {
      await apiRequest({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'DELETE',
        token: getToken(getState),
      });
      return id;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateDarsJadvaliThunk = createAsyncThunk(
  'admin/updateDarsJadvali',
  async ({ id, payload }, { getState, rejectWithValue }) => {
    try {
      return await apiRequest({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'PATCH',
        token: getToken(getState),
        body: payload,
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
      const path = type === 'teacher' ? `/api/admin/details/teachers/${id}` : `/api/admin/details/students/${id}`;
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
        path: '/api/admin/docs',
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
        path: `/api/admin/docs/${id}`,
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
        path: `/api/admin/docs/${id}`,
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
        path: '/api/admin/avatars',
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
        path: '/api/admin/avatars',
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
    subjects: {
      items: [],
      loading: false,
      error: null,
    },
    classrooms: {
      items: [],
      loading: false,
      error: null,
    },
    vaqtOraliqlari: {
      items: [],
      loading: false,
      error: null,
    },
    darsJadvali: {
      items: [],
      loading: false,
      error: null,
    },
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
      .addCase(fetchSubjectsThunk.pending, (state) => {
        state.subjects.loading = true;
        state.subjects.error = null;
      })
      .addCase(fetchSubjectsThunk.fulfilled, (state, action) => {
        state.subjects.loading = false;
        state.subjects.items = action.payload.subjects || [];
      })
      .addCase(fetchSubjectsThunk.rejected, (state, action) => {
        state.subjects.loading = false;
        state.subjects.error = action.payload || 'Fanlar olinmadi';
      })
      .addCase(fetchClassroomsThunk.pending, (state) => {
        state.classrooms.loading = true;
        state.classrooms.error = null;
      })
      .addCase(fetchClassroomsThunk.fulfilled, (state, action) => {
        state.classrooms.loading = false;
        state.classrooms.items = action.payload.classrooms || [];
      })
      .addCase(fetchClassroomsThunk.rejected, (state, action) => {
        state.classrooms.loading = false;
        state.classrooms.error = action.payload || 'Sinflar olinmadi';
      })
      .addCase(fetchVaqtOraliqlariThunk.pending, (state) => {
        state.vaqtOraliqlari.loading = true;
        state.vaqtOraliqlari.error = null;
      })
      .addCase(fetchVaqtOraliqlariThunk.fulfilled, (state, action) => {
        state.vaqtOraliqlari.loading = false;
        state.vaqtOraliqlari.items = action.payload.vaqtOraliqlari || [];
      })
      .addCase(fetchVaqtOraliqlariThunk.rejected, (state, action) => {
        state.vaqtOraliqlari.loading = false;
        state.vaqtOraliqlari.error = action.payload || 'Vaqt oraliqlari olinmadi';
      })
      .addCase(fetchDarsJadvaliThunk.pending, (state) => {
        state.darsJadvali.loading = true;
        state.darsJadvali.error = null;
      })
      .addCase(fetchDarsJadvaliThunk.fulfilled, (state, action) => {
        state.darsJadvali.loading = false;
        state.darsJadvali.items = action.payload.darslar || [];
      })
      .addCase(fetchDarsJadvaliThunk.rejected, (state, action) => {
        state.darsJadvali.loading = false;
        state.darsJadvali.error = action.payload || 'Dars jadvali olinmadi';
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
          !action.type.includes('fetchSubjects') &&
          !action.type.includes('fetchClassrooms') &&
          !action.type.includes('fetchVaqtOraliqlari') &&
          !action.type.includes('fetchDarsJadvali') &&
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
          !action.type.includes('fetchSubjects') &&
          !action.type.includes('fetchClassrooms') &&
          !action.type.includes('fetchVaqtOraliqlari') &&
          !action.type.includes('fetchDarsJadvali') &&
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
          !action.type.includes('fetchSubjects') &&
          !action.type.includes('fetchClassrooms') &&
          !action.type.includes('fetchVaqtOraliqlari') &&
          !action.type.includes('fetchDarsJadvali') &&
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
