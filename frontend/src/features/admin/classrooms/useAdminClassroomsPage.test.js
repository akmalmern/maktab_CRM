/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAdminClassroomsPage from './useAdminClassroomsPage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  useGetClassroomsQuery: vi.fn(),
  useGetClassroomsMetaQuery: vi.fn(),
  useCreateClassroomMutation: vi.fn(),
  useGetClassroomStudentsQuery: vi.fn(),
  usePreviewAnnualClassPromotionQuery: vi.fn(),
  useRemoveStudentFromClassroomMutation: vi.fn(),
  useRunAnnualClassPromotionMutation: vi.fn(),
  createClassroom: vi.fn(),
  removeStudentFromClassroom: vi.fn(),
  runAnnualPromotion: vi.fn(),
  studentsRefetch: vi.fn(),
  annualPreviewRefetch: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value) => value,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('../../../services/api/classroomsApi', () => ({
  useGetClassroomsQuery: mocks.useGetClassroomsQuery,
  useGetClassroomsMetaQuery: mocks.useGetClassroomsMetaQuery,
  useCreateClassroomMutation: mocks.useCreateClassroomMutation,
  useGetClassroomStudentsQuery: mocks.useGetClassroomStudentsQuery,
  usePreviewAnnualClassPromotionQuery: mocks.usePreviewAnnualClassPromotionQuery,
  useRemoveStudentFromClassroomMutation: mocks.useRemoveStudentFromClassroomMutation,
  useRunAnnualClassPromotionMutation: mocks.useRunAnnualClassPromotionMutation,
}));

describe('useAdminClassroomsPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.studentsRefetch.mockReset();
    mocks.annualPreviewRefetch.mockReset();

    mocks.createClassroom.mockReset();
    mocks.createClassroom.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.removeStudentFromClassroom.mockReset();
    mocks.removeStudentFromClassroom.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.runAnnualPromotion.mockReset();
    mocks.runAnnualPromotion.mockReturnValue({
      unwrap: () => Promise.resolve({ message: "Yillik sinf o'tkazish bajarildi" }),
    });

    mocks.useGetClassroomsQuery.mockReturnValue({
      data: {
        classrooms: [{ id: 'class-1', name: '8-A', academicYear: '2025-2026' }],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    mocks.useGetClassroomsMetaQuery.mockReturnValue({
      data: {
        meta: {
          currentAcademicYear: '2025-2026',
          nextAcademicYear: '2026-2027',
          allowedAcademicYears: ['2026-2027', '2025-2026'],
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    });
    mocks.useGetClassroomStudentsQuery.mockReturnValue({
      data: {
        students: [{ id: 'student-1', firstName: 'Ali', lastName: 'Karimov' }],
        page: 1,
        pages: 1,
        total: 1,
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mocks.studentsRefetch,
    });
    mocks.usePreviewAnnualClassPromotionQuery.mockReturnValue({
      data: {
        plan: { promoteCount: 10 },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mocks.annualPreviewRefetch,
    });
    mocks.useCreateClassroomMutation.mockReturnValue([mocks.createClassroom, { isLoading: false }]);
    mocks.useRemoveStudentFromClassroomMutation.mockReturnValue([
      mocks.removeStudentFromClassroom,
      { isLoading: false },
    ]);
    mocks.useRunAnnualClassPromotionMutation.mockReturnValue([
      mocks.runAnnualPromotion,
      { isLoading: false },
    ]);
  });

  it('maps classroom queries into workspace state', async () => {
    const { result } = renderHook(() => useAdminClassroomsPage());

    expect(result.current.classrooms).toHaveLength(1);
    expect(result.current.classroomsState.loading).toBe(false);
    expect(result.current.academicYearOptions).toEqual(['2026-2027', '2025-2026']);
    await waitFor(() => {
      expect(result.current.academicYear).toBe('2025-2026');
    });
  });

  it('confirms remove-student flow and calls remove mutation', async () => {
    const { result } = renderHook(() => useAdminClassroomsPage());

    await act(async () => {
      result.current.onOpenStudentModal('class-1');
    });
    await act(async () => {
      result.current.onRequestRemoveStudent({ id: 'student-1' });
    });
    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mocks.removeStudentFromClassroom).toHaveBeenCalledWith({
      classroomId: 'class-1',
      studentId: 'student-1',
    });
    expect(mocks.studentsRefetch).toHaveBeenCalledTimes(1);
  });

  it('confirms annual promotion flow and runs annual mutation', async () => {
    const { result } = renderHook(() => useAdminClassroomsPage());

    await act(async () => {
      result.current.onOpenAnnualModal();
      result.current.onRequestRunAnnualPromotion();
    });
    await act(async () => {
      await result.current.onConfirm();
    });

    expect(mocks.runAnnualPromotion).toHaveBeenCalledWith({ force: false });
  });
});
