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

    generatePayrollRun: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/oylik/runs/generate',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'PayrollRun', id: 'LIST' },
        { type: 'PayrollRealLesson', id: 'LIST' },
        { type: 'PayrollPayslip', id: 'LIST' },
      ],
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
  useGetPayrollTeacherRatesQuery,
  useCreatePayrollTeacherRateMutation,
  useUpdatePayrollTeacherRateMutation,
  useDeletePayrollTeacherRateMutation,
  useGetPayrollSubjectRatesQuery,
  useCreatePayrollSubjectRateMutation,
  useUpdatePayrollSubjectRateMutation,
  useDeletePayrollSubjectRateMutation,
  useGeneratePayrollRunMutation,
  useGetPayrollRunsQuery,
  useGetPayrollRunDetailQuery,
  useAddPayrollAdjustmentMutation,
  useDeletePayrollAdjustmentMutation,
  useApprovePayrollRunMutation,
  usePayPayrollRunMutation,
  useReversePayrollRunMutation,
  useExportPayrollRunCsvMutation,
  useGetTeacherPayslipsQuery,
  useGetTeacherPayslipDetailQuery,
} = payrollApi;
