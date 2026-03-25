/* @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAdminSchedulePage from './useAdminSchedulePage';

const mocks = vi.hoisted(() => ({
  useGetSubjectsQuery: vi.fn(),
  useGetClassroomsQuery: vi.fn(),
  useLazyGetTeachersQuery: vi.fn(),
  useScheduleTeachersDirectory: vi.fn(),
  fetchTeachersPage: vi.fn(),
}));

vi.mock('../../../services/api/subjectsApi', () => ({
  useGetSubjectsQuery: mocks.useGetSubjectsQuery,
}));

vi.mock('../../../services/api/classroomsApi', () => ({
  useGetClassroomsQuery: mocks.useGetClassroomsQuery,
}));

vi.mock('../../../services/api/peopleApi', () => ({
  useLazyGetTeachersQuery: mocks.useLazyGetTeachersQuery,
}));

vi.mock('../shared/useScheduleTeachersDirectory', () => ({
  default: mocks.useScheduleTeachersDirectory,
}));

describe('useAdminSchedulePage', () => {
  beforeEach(() => {
    mocks.useGetSubjectsQuery.mockReturnValue({
      data: { subjects: [{ id: 'subject-1' }] },
    });
    mocks.useGetClassroomsQuery.mockReturnValue({
      data: { classrooms: [{ id: 'class-1' }] },
    });
    mocks.useLazyGetTeachersQuery.mockReturnValue([mocks.fetchTeachersPage]);
    mocks.useScheduleTeachersDirectory.mockReturnValue({
      items: [{ id: 'teacher-1' }],
      total: 1,
      loading: false,
      partial: false,
      error: null,
    });
  });

  it('returns normalized schedule workspace state', () => {
    const { result } = renderHook(() => useAdminSchedulePage());

    expect(result.current.classrooms).toEqual([{ id: 'class-1' }]);
    expect(result.current.subjects).toEqual([{ id: 'subject-1' }]);
    expect(result.current.teachers).toEqual([{ id: 'teacher-1' }]);
    expect(result.current.teachersState.total).toBe(1);
    expect(mocks.useScheduleTeachersDirectory).toHaveBeenCalledTimes(1);
  });
});
