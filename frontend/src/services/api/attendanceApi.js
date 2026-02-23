import { baseApi } from './baseApi';

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminAttendanceReport: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/davomat/hisobot',
        query: params,
      }),
      providesTags: [{ type: 'AttendanceReport', id: 'LATEST' }],
    }),
  }),
});

export const { useGetAdminAttendanceReportQuery } = attendanceApi;
