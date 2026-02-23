import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginAuth: builder.mutation({
      query: (credentials) => ({
        path: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    refreshAuth: builder.mutation({
      query: () => ({
        path: '/api/auth/refresh',
        method: 'POST',
      }),
    }),
    getAuthMe: builder.query({
      query: () => ({
        path: '/api/auth/me',
      }),
      providesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
    logoutAuth: builder.mutation({
      query: () => ({
        path: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'AuthSession', id: 'ME' }],
    }),
  }),
});

export const {
  useLoginAuthMutation,
  useRefreshAuthMutation,
  useGetAuthMeQuery,
  useLogoutAuthMutation,
} = authApi;

