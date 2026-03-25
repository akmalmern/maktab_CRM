import { baseApi } from './baseApi';

export const accountSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateAccountProfile: builder.mutation({
      query: ({ scope, ...payload }) => ({
        path: `/api/${scope}/profil`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
    changeAccountPassword: builder.mutation({
      query: ({ scope, ...payload }) => ({
        path: `/api/${scope}/profil/password`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
    uploadAccountAvatar: builder.mutation({
      query: ({ scope, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          path: `/api/${scope}/profil/avatar`,
          method: 'POST',
          body: formData,
          isFormData: true,
        };
      },
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
    deleteAccountAvatar: builder.mutation({
      query: ({ scope }) => ({
        path: `/api/${scope}/profil/avatar`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
  }),
});

export const {
  useUpdateAccountProfileMutation,
  useChangeAccountPasswordMutation,
  useUploadAccountAvatarMutation,
  useDeleteAccountAvatarMutation,
} = accountSettingsApi;
