import { apiDownload, getErrorMessage } from '../../lib/apiClient';
import { baseApi } from './baseApi';

export const exportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    exportAttendanceReport: builder.mutation({
      async queryFn({ format = 'pdf', params = {} }) {
        const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
        try {
          const result = await apiDownload({
            path: `/api/admin/davomat/hisobot/export/${safeFormat}`,
            query: params,
          });
          return { data: result };
        } catch (error) {
          return {
            error: {
              status: error?.status || 500,
              data: error?.payload || null,
              message: getErrorMessage(error),
            },
          };
        }
      },
    }),
    exportFinanceDebtors: builder.mutation({
      async queryFn({ format = 'pdf', params = {} }) {
        const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
        try {
          const result = await apiDownload({
            path: `/api/admin/moliya/students/export/${safeFormat}`,
            query: params,
          });
          return { data: result };
        } catch (error) {
          return {
            error: {
              status: error?.status || 500,
              data: error?.payload || null,
              message: getErrorMessage(error),
            },
          };
        }
      },
    }),
  }),
});

export const { useExportAttendanceReportMutation, useExportFinanceDebtorsMutation } = exportApi;

