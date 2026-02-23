import { baseApi } from './baseApi';

export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminVaqtOraliqlari: builder.query({
      query: () => ({ path: '/api/admin/vaqt-oraliqlari' }),
      providesTags: (result) => {
        const rows = result?.vaqtOraliqlari || [];
        return [
          { type: 'TimeSlot', id: 'LIST' },
          ...rows.map((row) => ({ type: 'TimeSlot', id: row.id })),
        ];
      },
    }),
    getAdminDarsJadvali: builder.query({
      query: (params = {}) => ({
        path: '/api/admin/dars-jadval',
        query: params,
      }),
      providesTags: (result) => {
        const rows = result?.darslar || [];
        return [
          { type: 'Schedule', id: 'LIST' },
          ...rows.map((row) => ({ type: 'Schedule', id: row.id })),
        ];
      },
    }),
    createAdminVaqtOraliq: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/vaqt-oraliqlari',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
    deleteAdminVaqtOraliq: builder.mutation({
      query: (id) => ({
        path: `/api/admin/vaqt-oraliqlari/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'TimeSlot', id: 'LIST' }],
    }),
    createAdminDarsJadvali: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/dars-jadval',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),
    deleteAdminDarsJadvali: builder.mutation({
      query: (id) => ({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),
    updateAdminDarsJadvali: builder.mutation({
      query: ({ id, payload }) => ({
        path: `/api/admin/dars-jadval/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Schedule', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetAdminVaqtOraliqlariQuery,
  useGetAdminDarsJadvaliQuery,
  useCreateAdminVaqtOraliqMutation,
  useDeleteAdminVaqtOraliqMutation,
  useCreateAdminDarsJadvaliMutation,
  useDeleteAdminDarsJadvaliMutation,
  useUpdateAdminDarsJadvaliMutation,
} = scheduleApi;
