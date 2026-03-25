import { baseApi } from './baseApi';

export const classroomsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClassrooms: builder.query({
      query: () => ({ path: '/api/admin/classrooms' }),
      providesTags: (result) => {
        const rows = result?.classrooms || [];
        return [
          { type: 'Classroom', id: 'LIST' },
          ...rows.map((row) => ({ type: 'Classroom', id: row.id })),
        ];
      },
    }),
    getClassroomsMeta: builder.query({
      query: () => ({ path: '/api/admin/classrooms/meta' }),
      providesTags: [{ type: 'Classroom', id: 'META' }],
    }),
    getClassroomStudents: builder.query({
      query: ({ classroomId, page = 1, limit = 20, search }) => ({
        path: `/api/admin/classrooms/${classroomId}/students`,
        query: {
          page,
          limit,
          search: search || undefined,
        },
      }),
      providesTags: (result, error, arg) => [
        { type: 'ClassroomStudentList', id: `${arg?.classroomId || 'unknown'}:${arg?.page || 1}:${arg?.search || ''}` },
        ...(result?.students || []).map((student) => ({ type: 'Student', id: student.id })),
      ],
    }),
    createClassroom: builder.mutation({
      query: (payload) => ({
        path: '/api/admin/classrooms',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: 'META' },
      ],
    }),
    removeStudentFromClassroom: builder.mutation({
      query: ({ classroomId, studentId }) => ({
        path: `/api/admin/classrooms/${classroomId}/students/${studentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: arg?.classroomId },
        { type: 'Classroom', id: 'META' },
        'ClassroomStudentList',
        { type: 'Student', id: arg?.studentId },
        { type: 'Student', id: 'LIST' },
        { type: 'PersonDetail', id: `student:${arg?.studentId}` },
      ],
    }),
    previewAnnualClassPromotion: builder.query({
      query: () => ({
        path: '/api/admin/classrooms/yillik-otkazish/preview',
      }),
    }),
    runAnnualClassPromotion: builder.mutation({
      query: (payload = {}) => ({
        path: '/api/admin/classrooms/yillik-otkazish',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: [
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: 'META' },
        { type: 'Student', id: 'LIST' },
        'ClassroomStudentList',
      ],
    }),
    previewPromoteClassroom: builder.mutation({
      query: ({ sourceClassroomId, targetClassroomId }) => ({
        path: `/api/admin/classrooms/${sourceClassroomId}/promote-preview`,
        method: 'POST',
        body: { targetClassroomId },
      }),
    }),
    promoteClassroom: builder.mutation({
      query: ({ sourceClassroomId, targetClassroomId }) => ({
        path: `/api/admin/classrooms/${sourceClassroomId}/promote`,
        method: 'POST',
        body: { targetClassroomId },
      }),
      invalidatesTags: [
        { type: 'Classroom', id: 'LIST' },
        { type: 'Classroom', id: 'META' },
        { type: 'Student', id: 'LIST' },
        'ClassroomStudentList',
      ],
    }),
  }),
});

export const {
  useGetClassroomsQuery,
  useGetClassroomsMetaQuery,
  useGetClassroomStudentsQuery,
  useLazyGetClassroomStudentsQuery,
  useCreateClassroomMutation,
  useRemoveStudentFromClassroomMutation,
  usePreviewAnnualClassPromotionQuery,
  useLazyPreviewAnnualClassPromotionQuery,
  useRunAnnualClassPromotionMutation,
  usePreviewPromoteClassroomMutation,
  usePromoteClassroomMutation,
} = classroomsApi;
