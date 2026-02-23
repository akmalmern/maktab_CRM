import { baseApi } from './baseApi';

export const teacherApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTeacherProfile: builder.query({
      query: () => ({ path: '/api/teacher/profil' }),
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
    }),
    getTeacherAttendanceDarsDetail: builder.query({
      query: ({ darsId, ...params }) => ({
        path: `/api/teacher/davomat/dars/${darsId}`,
        query: params,
      }),
    }),
    saveTeacherAttendanceDars: builder.mutation({
      query: ({ darsId, payload }) => ({
        path: `/api/teacher/davomat/dars/${darsId}`,
        method: 'POST',
        body: payload,
      }),
    }),
    getTeacherAttendanceHistory: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/davomat/tarix',
        query: params,
      }),
    }),
  }),
});

export const {
  useGetTeacherProfileQuery,
  useLazyGetTeacherScheduleQuery,
  useLazyGetTeacherGradesQuery,
  useLazyGetTeacherAttendanceDarslarQuery,
  useLazyGetTeacherAttendanceDarsDetailQuery,
  useSaveTeacherAttendanceDarsMutation,
  useLazyGetTeacherAttendanceHistoryQuery,
} = teacherApi;

