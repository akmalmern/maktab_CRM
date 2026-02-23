import { createApi } from '@reduxjs/toolkit/query/react';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const axiosBaseQuery =
  () =>
  async ({ path, method = 'GET', body, query, headers, isFormData, signal }) => {
    try {
      const data = await apiRequest({
        path,
        method,
        body,
        query,
        headers,
        isFormData,
        signal,
      });
      return { data };
    } catch (error) {
      return {
        error: {
          status: error?.status || 500,
          data: error?.payload || null,
          message: getErrorMessage(error),
        },
      };
    }
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  tagTypes: [
    'AuthSession',
    'Subject',
    'Classroom',
    'Teacher',
    'Student',
    'ClassroomStudentList',
    'Schedule',
    'TimeSlot',
    'AttendanceReport',
    'FinanceSettings',
    'FinanceStudents',
    'FinanceStudentDetail',
    'PersonDetail',
  ],
  endpoints: () => ({}),
});
