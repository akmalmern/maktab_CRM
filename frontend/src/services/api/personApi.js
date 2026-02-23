import { apiDownload, getErrorMessage } from '../../lib/apiClient';
import { baseApi } from './baseApi';

export const personApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminPersonDetail: builder.query({
      query: ({ type, id }) => ({
        path: type === 'teacher' ? `/api/admin/details/teachers/${id}` : `/api/admin/details/students/${id}`,
      }),
      transformResponse: (response, meta, arg) => ({
        type: arg.type,
        id: arg.id,
        data: arg.type === 'teacher' ? response.teacher : response.student,
      }),
      providesTags: (result, error, arg) => [{ type: 'PersonDetail', id: `${arg.type}:${arg.id}` }],
    }),
    uploadAdminDocument: builder.mutation({
      query: ({ ownerType, ownerId, file, kind, title }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (kind) formData.append('kind', kind);
        if (title) formData.append('title', title);
        if (ownerType === 'teacher') formData.append('teacherId', ownerId);
        if (ownerType === 'student') formData.append('studentId', ownerId);
        return {
          path: '/api/admin/docs',
          method: 'POST',
          body: formData,
          isFormData: true,
        };
      },
    }),
    updateAdminDocument: builder.mutation({
      query: ({ id, kind, title }) => ({
        path: `/api/admin/docs/${id}`,
        method: 'PATCH',
        body: { kind, title },
      }),
    }),
    deleteAdminDocument: builder.mutation({
      query: (id) => ({
        path: `/api/admin/docs/${id}`,
        method: 'DELETE',
      }),
    }),
    downloadAdminDocument: builder.mutation({
      async queryFn({ id }) {
        try {
          const result = await apiDownload({
            path: `/api/admin/docs/${id}/download`,
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
    uploadAdminAvatar: builder.mutation({
      query: ({ userId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        return {
          path: '/api/admin/avatars',
          method: 'POST',
          body: formData,
          isFormData: true,
        };
      },
    }),
    deleteAdminAvatar: builder.mutation({
      query: ({ userId }) => ({
        path: '/api/admin/avatars',
        method: 'DELETE',
        body: { userId },
      }),
    }),
    resetAdminPersonPassword: builder.mutation({
      query: ({ type, id, newPassword }) => ({
        path:
          type === 'teacher'
            ? `/api/admin/details/teachers/${id}/reset-password`
            : `/api/admin/details/students/${id}/reset-password`,
        method: 'POST',
        body: { newPassword },
      }),
    }),
  }),
});

export const {
  useGetAdminPersonDetailQuery,
  useUploadAdminDocumentMutation,
  useUpdateAdminDocumentMutation,
  useDeleteAdminDocumentMutation,
  useDownloadAdminDocumentMutation,
  useUploadAdminAvatarMutation,
  useDeleteAdminAvatarMutation,
  useResetAdminPersonPasswordMutation,
} = personApi;

