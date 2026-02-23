import { baseApi } from './baseApi';

export const subjectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query({
      query: () => ({ path: '/api/admin/subjects' }),
      providesTags: (result) => {
        const subjects = result?.subjects || [];
        return [
          { type: 'Subject', id: 'LIST' },
          ...subjects.map((s) => ({ type: 'Subject', id: s.id })),
        ];
      },
    }),
    createSubject: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/subjects',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [{ type: 'Subject', id: 'LIST' }],
    }),
    deleteSubject: builder.mutation({
      query: (subjectId) => ({
        path: `/api/admin/subjects/${subjectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Subject', id },
        { type: 'Subject', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetSubjectsQuery,
  useCreateSubjectMutation,
  useDeleteSubjectMutation,
} = subjectsApi;

