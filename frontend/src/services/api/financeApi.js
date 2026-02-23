import { baseApi } from './baseApi';

export const financeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFinanceSettings: builder.query({
      query: () => ({
        path: '/api/admin/moliya/settings',
      }),
      providesTags: [{ type: 'FinanceSettings', id: 'CURRENT' }],
    }),
    getFinanceStudents: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/moliya/students',
        query: params,
      }),
      providesTags: [{ type: 'FinanceStudents', id: 'LIST' }],
    }),
    getFinanceStudentDetail: builder.query({
      query: (studentId) => ({
        path: `/api/admin/moliya/students/${studentId}`,
      }),
      providesTags: (result, error, studentId) => [
        { type: 'FinanceStudentDetail', id: 'LIST' },
        { type: 'FinanceStudentDetail', id: studentId },
      ],
    }),
    updateFinanceSettings: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/moliya/settings',
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudents', id: 'LIST' },
      ],
    }),
    createFinancePayment: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/admin/moliya/students/${studentId}/tolov`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'FinanceStudents', id: 'LIST' },
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudentDetail', id: studentId },
      ],
    }),
    createFinanceImtiyoz: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/admin/moliya/students/${studentId}/imtiyoz`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'FinanceStudents', id: 'LIST' },
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudentDetail', id: studentId },
      ],
    }),
    deactivateFinanceImtiyoz: builder.mutation({
      query: ({ imtiyozId, payload }) => ({
        path: `/api/admin/moliya/imtiyoz/${imtiyozId}`,
        method: 'DELETE',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'FinanceStudents', id: 'LIST' },
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudentDetail', id: 'LIST' },
      ],
    }),
    rollbackFinanceTarif: builder.mutation({
      query: ({ tarifId, payload }) => ({
        path: `/api/admin/moliya/tariflar/${tarifId}/rollback`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudents', id: 'LIST' },
        { type: 'FinanceStudentDetail', id: 'LIST' },
      ],
    }),
    revertFinancePayment: builder.mutation({
      query: (tolovId) => ({
        path: `/api/admin/moliya/tolov/${tolovId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'FinanceSettings', id: 'CURRENT' },
        { type: 'FinanceStudents', id: 'LIST' },
        { type: 'FinanceStudentDetail', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetFinanceSettingsQuery,
  useGetFinanceStudentsQuery,
  useLazyGetFinanceStudentDetailQuery,
  useUpdateFinanceSettingsMutation,
  useCreateFinancePaymentMutation,
  useCreateFinanceImtiyozMutation,
  useDeactivateFinanceImtiyozMutation,
  useRollbackFinanceTarifMutation,
  useRevertFinancePaymentMutation,
} = financeApi;
