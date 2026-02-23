import { baseApi } from './baseApi';

export const studentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudentProfile: builder.query({
      query: () => ({ path: '/api/student/profil' }),
    }),
    getStudentSchedule: builder.query({
      query: (params = {}) => ({
        path: '/api/student/jadval',
        query: params,
      }),
    }),
    getStudentAttendance: builder.query({
      query: (params = {}) => ({
        path: '/api/student/davomat',
        query: params,
      }),
    }),
    getStudentGrades: builder.query({
      query: (params = {}) => ({
        path: '/api/student/baholar',
        query: params,
      }),
    }),
    getStudentClassGrades: builder.query({
      query: (params = {}) => ({
        path: '/api/student/sinf-baholar',
        query: params,
      }),
    }),
  }),
});

export const {
  useGetStudentProfileQuery,
  useLazyGetStudentScheduleQuery,
  useLazyGetStudentAttendanceQuery,
  useLazyGetStudentGradesQuery,
  useLazyGetStudentClassGradesQuery,
} = studentApi;

