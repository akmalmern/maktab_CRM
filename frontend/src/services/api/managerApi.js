import { baseApi } from './baseApi';

export const managerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getManagerClassrooms: builder.query({
      query: () => ({ path: '/api/manager/sinflar' }),
    }),
    getManagerDebtors: builder.query({
      query: (params = {}) => ({
        path: '/api/manager/qarzdorlar',
        query: params,
      }),
    }),
    getManagerDebtorNotes: builder.query({
      query: ({ studentId, ...params }) => ({
        path: `/api/manager/qarzdorlar/${studentId}/izohlar`,
        query: params,
      }),
    }),
    createManagerDebtorNote: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/qarzdorlar/${studentId}/izohlar`,
        method: 'POST',
        body: payload,
      }),
    }),
    getManagerPaymentStudentDetail: builder.query({
      query: (studentId) => ({
        path: `/api/manager/tolov/students/${studentId}`,
      }),
    }),
    createManagerPayment: builder.mutation({
      query: ({ studentId, payload }) => ({
        path: `/api/manager/tolov/students/${studentId}`,
        method: 'POST',
        body: payload,
      }),
    }),
  }),
});

export const {
  useLazyGetManagerClassroomsQuery,
  useLazyGetManagerDebtorsQuery,
  useLazyGetManagerDebtorNotesQuery,
  useCreateManagerDebtorNoteMutation,
  useLazyGetManagerPaymentStudentDetailQuery,
  useCreateManagerPaymentMutation,
} = managerApi;

