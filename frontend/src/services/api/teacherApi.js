import { baseApi } from './baseApi';

export const teacherApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeacherProfile: builder.query({
      query: () => ({ path: '/api/teacher/profil' }),
      providesTags: [{ type: 'TeacherProfile', id: 'CURRENT' }],
    }),
    updateTeacherProfile: builder.mutation({
      query: (payload) => ({
        path: '/api/teacher/profil',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'TeacherProfile', id: 'CURRENT' },
        { type: 'AuthSession', id: 'ME' },
      ],
    }),
    changeTeacherPassword: builder.mutation({
      query: (payload) => ({
        path: '/api/teacher/profil/password',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
    uploadTeacherAvatar: builder.mutation({
      query: ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          path: '/api/teacher/profil/avatar',
          method: 'POST',
          body: formData,
          isFormData: true,
        };
      },
      invalidatesTags: [
        { type: 'TeacherProfile', id: 'CURRENT' },
        { type: 'AuthSession', id: 'ME' },
      ],
    }),
    deleteTeacherAvatar: builder.mutation({
      query: () => ({
        path: '/api/teacher/profil/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'TeacherProfile', id: 'CURRENT' },
        { type: 'AuthSession', id: 'ME' },
      ],
    }),
    getTeacherSchedule: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/jadval',
        query: params,
      }),
    }),
    getTeacherGrades: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/baholar',
        query: params,
      }),
    }),
    getTeacherAttendanceDarslar: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/davomat/darslar',
        query: params,
      }),
      providesTags: [{ type: 'TeacherAttendance', id: 'DARS_LIST' }],
    }),
    getTeacherAttendanceDarsDetail: builder.query({
      query: ({ darsId, ...params }) => ({
        path: `/api/teacher/davomat/dars/${darsId}`,
        query: params,
      }),
      providesTags: (result, error, { darsId }) => [
        { type: 'TeacherAttendance', id: 'DARS_LIST' },
        { type: 'TeacherAttendance', id: `DARS:${darsId}` },
      ],
    }),
    saveTeacherAttendanceDars: builder.mutation({
      query: ({ darsId, payload }) => ({
        path: `/api/teacher/davomat/dars/${darsId}`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { darsId }) => [
        { type: 'TeacherAttendance', id: 'DARS_LIST' },
        { type: 'TeacherAttendance', id: 'HISTORY' },
        { type: 'TeacherAttendance', id: `DARS:${darsId}` },
        { type: 'TeacherProfile', id: 'CURRENT' },
      ],
    }),
    getTeacherAttendanceHistory: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/davomat/tarix',
        query: params,
      }),
      providesTags: [{ type: 'TeacherAttendance', id: 'HISTORY' }],
    }),
  }),
});

export const {
  useGetTeacherProfileQuery,
  useUpdateTeacherProfileMutation,
  useChangeTeacherPasswordMutation,
  useUploadTeacherAvatarMutation,
  useDeleteTeacherAvatarMutation,
  useGetTeacherScheduleQuery,
  useLazyGetTeacherScheduleQuery,
  useGetTeacherGradesQuery,
  useLazyGetTeacherGradesQuery,
  useGetTeacherAttendanceDarslarQuery,
  useLazyGetTeacherAttendanceDarslarQuery,
  useGetTeacherAttendanceDarsDetailQuery,
  useLazyGetTeacherAttendanceDarsDetailQuery,
  useSaveTeacherAttendanceDarsMutation,
  useGetTeacherAttendanceHistoryQuery,
  useLazyGetTeacherAttendanceHistoryQuery,
} = teacherApi;
