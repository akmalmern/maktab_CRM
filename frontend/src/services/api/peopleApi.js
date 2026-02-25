import { baseApi } from './baseApi';

function buildListTags(type, result, listKey) {
  const rows = result?.[listKey] || [];
  return [
    { type, id: 'LIST' },
    ...rows.map((row) => ({ type, id: row.id })),
  ];
}

export const peopleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeachers: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/teachers',
        query: params,
      }),
      providesTags: (result) => buildListTags('Teacher', result, 'teachers'),
    }),
    getStudents: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/students',
        query: params,
      }),
      providesTags: (result) => buildListTags('Student', result, 'students'),
    }),
    deleteTeacher: builder.mutation({
      query: (teacherId) => ({
        path: `/api/admin/teachers/${teacherId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, teacherId) => [
        { type: 'Teacher', id: teacherId },
        { type: 'Teacher', id: 'LIST' },
      ],
    }),
    restoreTeacher: builder.mutation({
      query: (arg) => {
        const teacherId = typeof arg === 'string' ? arg : arg?.teacherId;
        const payload = typeof arg === 'string' ? {} : (arg?.payload || {});
        return {
          path: `/api/admin/teachers/${teacherId}/restore`,
          method: 'POST',
          body: payload,
        };
      },
      invalidatesTags: (result, error, arg) => {
        const teacherId = typeof arg === 'string' ? arg : arg?.teacherId;
        return [
          { type: 'Teacher', id: teacherId },
          { type: 'Teacher', id: 'LIST' },
        ];
      },
    }),
    deleteStudent: builder.mutation({
      query: (studentId) => ({
        path: `/api/admin/students/${studentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, studentId) => [
        { type: 'Student', id: studentId },
        { type: 'Student', id: 'LIST' },
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: 'META' },
      ],
    }),
    restoreStudent: builder.mutation({
      query: (arg) => {
        const studentId = typeof arg === 'string' ? arg : arg?.studentId;
        const payload = typeof arg === 'string' ? {} : (arg?.payload || {});
        return {
          path: `/api/admin/students/${studentId}/restore`,
          method: 'POST',
          body: payload,
        };
      },
      invalidatesTags: (result, error, arg) => {
        const studentId = typeof arg === 'string' ? arg : arg?.studentId;
        return [
          { type: 'Student', id: studentId },
          { type: 'Student', id: 'LIST' },
          { type: 'Classroom', id: 'LIST' },
          { type: 'Classroom', id: 'META' },
        ];
      },
    }),
    createTeacher: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/teachers',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Teacher', id: 'LIST' },
      ],
    }),
    createStudent: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/students',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Student', id: 'LIST' },
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: 'META' },
      ],
    }),
  }),
});

export const {
  useGetTeachersQuery,
  useGetStudentsQuery,
  useDeleteTeacherMutation,
  useRestoreTeacherMutation,
  useDeleteStudentMutation,
  useRestoreStudentMutation,
  useCreateTeacherMutation,
  useCreateStudentMutation,
} = peopleApi;
