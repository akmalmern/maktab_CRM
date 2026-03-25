import { baseApi } from './baseApi';

export const managerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getManagerClassrooms: builder.query({
      query: () => ({ path: '/api/manager/sinflar' }),
      providesTags: [{ type: 'ManagerClassroom', id: 'LIST' }],
    }),
    getManagerDebtors: builder.query({
      query: (params = {}) => ({
        path: '/api/manager/qarzdorlar',
        query: params,
      }),
      providesTags: [{ type: 'ManagerDebtorList', id: 'LIST' }],
    }),
    getManagerDebtorNotes: builder.query({
      query: ({ studentId, ...params }) => ({
        path: `/api/manager/qarzdorlar/${studentId}/izohlar`,
        query: params,
      }),
      providesTags: (result, error, { studentId }) => [
        { type: 'ManagerDebtorNotes', id: studentId },
      ],
    }),
    createManagerDebtorNote: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/qarzdorlar/${studentId}/izohlar`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'ManagerDebtorNotes', id: studentId },
        { type: 'ManagerDebtorList', id: 'LIST' },
      ],
    }),
    getManagerPaymentStudentDetail: builder.query({
      query: (studentId) => ({
        path: `/api/manager/tolov/students/${studentId}`,
      }),
      providesTags: (result, error, studentId) => [
        { type: 'ManagerPaymentDetail', id: 'LIST' },
        { type: 'ManagerPaymentDetail', id: studentId },
      ],
    }),
    previewManagerPayment: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/tolov/students/${studentId}/preview`,
        method: 'POST',
        body: payload,
      }),
    }),
    createManagerPayment: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/tolov/students/${studentId}`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'ManagerPaymentDetail', id: studentId },
        { type: 'ManagerDebtorList', id: 'LIST' },
      ],
    }),
    createManagerImtiyoz: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/tolov/students/${studentId}/imtiyoz`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (result, error, { studentId }) => [
        { type: 'ManagerPaymentDetail', id: studentId },
        { type: 'ManagerDebtorList', id: 'LIST' },
      ],
    }),
    deactivateManagerImtiyoz: builder.mutation({
      query: ({ imtiyozId, payload }) => ({
        path: `/api/manager/tolov/imtiyoz/${imtiyozId}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'ManagerPaymentDetail', id: 'LIST' },
        { type: 'ManagerDebtorList', id: 'LIST' },
      ],
    }),
    revertManagerPayment: builder.mutation({
      query: (tolovId) => ({
        path: `/api/manager/tolov/${tolovId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'ManagerPaymentDetail', id: 'LIST' },
        { type: 'ManagerDebtorList', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetManagerClassroomsQuery,
  useGetManagerDebtorsQuery,
  useGetManagerDebtorNotesQuery,
  useGetManagerPaymentStudentDetailQuery,
  useLazyGetManagerClassroomsQuery,
  useLazyGetManagerDebtorsQuery,
  useLazyGetManagerDebtorNotesQuery,
  useCreateManagerDebtorNoteMutation,
  useLazyGetManagerPaymentStudentDetailQuery,
  usePreviewManagerPaymentMutation,
  useCreateManagerPaymentMutation,
  useCreateManagerImtiyozMutation,
  useDeactivateManagerImtiyozMutation,
  useRevertManagerPaymentMutation,
} = managerApi;
