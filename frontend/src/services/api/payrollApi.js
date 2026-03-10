import { apiDownload, getErrorMessage } from '../../lib/apiClient';
import { baseApi } from './baseApi';

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollRealLessons: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/real-lessons',
        query: params,
      }),
      providesTags: [{ type: 'PayrollRealLesson', id: 'LIST' }],
    }),
    createPayrollRealLesson: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/real-lessons',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    updatePayrollRealLessonStatus: builder.mutation({
      query: ({ lessonId, payload }) => ({
        path: `/api/admin/moliya/oylik/real-lessons/${lessonId}/status`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    bulkUpdatePayrollRealLessonStatus: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/real-lessons/bulk-status',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),

    getPayrollTeacherRates: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/rates/teacher',
        query: params,
      }),
      providesTags: [{ type: 'PayrollRate', id: 'TEACHER_LIST' }],
    }),
    createPayrollTeacherRate: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/rates/teacher',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'TEACHER_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    updatePayrollTeacherRate: builder.mutation({
      query: ({ rateId, payload }) => ({
        path: `/api/admin/moliya/oylik/rates/teacher/${rateId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'TEACHER_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    deletePayrollTeacherRate: builder.mutation({
      query: (rateId) => ({
        path: `/api/admin/moliya/oylik/rates/teacher/${rateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'TEACHER_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),

    getPayrollSubjectRates: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/rates/subjects',
        query: params,
      }),
      providesTags: [{ type: 'PayrollRate', id: 'SUBJECT_LIST' }],
    }),
    createPayrollSubjectRate: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/rates/subjects',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'SUBJECT_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    updatePayrollSubjectRate: builder.mutation({
      query: ({ rateId, payload }) => ({
        path: `/api/admin/moliya/oylik/rates/subjects/${rateId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'SUBJECT_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),
    deletePayrollSubjectRate: builder.mutation({
      query: (rateId) => ({
        path: `/api/admin/moliya/oylik/rates/subjects/${rateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'PayrollRate', id: 'SUBJECT_LIST' },
        { type: 'PayrollRun', id: 'LIST' },
      ],
    }),

    getPayrollEmployees: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/employees',
        query: params,
      }),
      providesTags: (result) => [
        { type: 'PayrollEmployee', id: 'LIST' },
        ...((result?.employees || []).map((row) => ({ type: 'PayrollEmployee', id: row.id }))),
      ],
    }),
    updatePayrollEmployeeConfig: builder.mutation({
      query: ({ employeeId, payload }) => ({
        path: `/api/admin/moliya/oylik/employees/${employeeId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, { employeeId }) => [
        { type: 'PayrollEmployee', id: 'LIST' },
        { type: 'PayrollEmployee', id: employeeId },
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),

    getPayrollAdvances: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/advances',
        query: params,
      }),
      providesTags: (result) => [
        { type: 'PayrollAdvance', id: 'LIST' },
        ...((result?.advances || []).map((row) => ({ type: 'PayrollAdvance', id: row.id }))),
      ],
    }),
    createPayrollAdvance: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/advances',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollAdvance', id: 'LIST' },
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    deletePayrollAdvance: builder.mutation({
      query: (advanceId) => ({
        path: `/api/admin/moliya/oylik/advances/${advanceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, advanceId) => [
        { type: 'PayrollAdvance', id: 'LIST' },
        { type: 'PayrollAdvance', id: advanceId },
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),

    generatePayrollRun: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/runs/generate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    getPayrollAutomationHealth: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/automation/health',
        query: params,
      }),
      providesTags: [{ type: 'PayrollRun', id: 'AUTOMATION_HEALTH' }],
    }),
    runPayrollAutomation: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/automation/run',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: 'AUTOMATION_HEALTH' },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    getPayrollMonthlyReport: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/reports/monthly',
        query: params,
      }),
      providesTags: [{ type: 'PayrollRun', id: 'MONTHLY_REPORT' }],
    }),
    getPayrollRuns: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/oylik/runs',
        query: params,
      }),
      providesTags: (result) => [
        { type: 'PayrollRun', id: 'LIST' },
        ...((result?.runs || []).map((row) => ({ type: 'PayrollRun', id: row.id }))),
      ],
    }),
    getPayrollRunDetail: builder.query({
      query: ({ runId, params = {} }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}`,
        query: params,
      }),
      providesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: runId },
      ],
    }),
    addPayrollAdjustment: builder.mutation({
      query: ({ runId, payload }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/adjustments`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    deletePayrollAdjustment: builder.mutation({
      query: ({ runId, lineId }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/adjustments/${lineId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    approvePayrollRun: builder.mutation({
      query: (runId) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, runId) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    payPayrollRun: builder.mutation({
      query: ({ runId, payload }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/pay`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    payPayrollItem: builder.mutation({
      query: ({ runId, itemId, payload }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/items/${itemId}/pay`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    reversePayrollRun: builder.mutation({
      query: ({ runId, payload }) => ({
        path: `/api/admin/moliya/oylik/runs/${runId}/reverse`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { runId }) => [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRun', id: runId },
        { type: 'PayrollRun', id: 'MONTHLY_REPORT' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
    }),
    exportPayrollRunCsv: builder.mutation({
      async queryFn({ runId, params = {} }) {
        try {
          const result = await apiDownload({
            path: `/api/admin/moliya/oylik/runs/${runId}/export/csv`,
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

    getTeacherPayslips: builder.query({
      query: (params = {}) => ({
        path: '/api/teacher/oyliklar',
        query: params,
      }),
      providesTags: (result) => [
        { type: 'PayrollPayslip', id: 'LIST' },
        ...((result?.payslips || []).map((row) => ({ type: 'PayrollPayslip', id: row.payrollRunId || row.id }))),
      ],
    }),
    getTeacherPayslipDetail: builder.query({
      query: ({ runId, params = {} }) => ({
        path: `/api/teacher/oyliklar/${runId}`,
        query: params,
      }),
      providesTags: (result, error, { runId }) => [
        { type: 'PayrollPayslip', id: runId },
      ],
    }),
  }),
});

export const {
  useGetPayrollRealLessonsQuery,
  useCreatePayrollRealLessonMutation,
  useUpdatePayrollRealLessonStatusMutation,
  useBulkUpdatePayrollRealLessonStatusMutation,
  useGetPayrollTeacherRatesQuery,
  useCreatePayrollTeacherRateMutation,
  useUpdatePayrollTeacherRateMutation,
  useDeletePayrollTeacherRateMutation,
  useGetPayrollSubjectRatesQuery,
  useCreatePayrollSubjectRateMutation,
  useUpdatePayrollSubjectRateMutation,
  useDeletePayrollSubjectRateMutation,
  useGetPayrollEmployeesQuery,
  useUpdatePayrollEmployeeConfigMutation,
  useGetPayrollAdvancesQuery,
  useCreatePayrollAdvanceMutation,
  useDeletePayrollAdvanceMutation,
  useGeneratePayrollRunMutation,
  useGetPayrollAutomationHealthQuery,
  useRunPayrollAutomationMutation,
  useGetPayrollMonthlyReportQuery,
  useGetPayrollRunsQuery,
  useGetPayrollRunDetailQuery,
  useAddPayrollAdjustmentMutation,
  useDeletePayrollAdjustmentMutation,
  useApprovePayrollRunMutation,
  usePayPayrollRunMutation,
  usePayPayrollItemMutation,
  useReversePayrollRunMutation,
  useExportPayrollRunCsvMutation,
  useGetTeacherPayslipsQuery,
  useGetTeacherPayslipDetailQuery,
} = payrollApi;
