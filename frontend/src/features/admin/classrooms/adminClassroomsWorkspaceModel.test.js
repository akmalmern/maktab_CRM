import { describe, expect, it, vi } from 'vitest';
import { buildAdminClassroomsWorkspaceModel } from './adminClassroomsWorkspaceModel';

describe('buildAdminClassroomsWorkspaceModel', () => {
  it('maps page state into workspace view model', () => {
    const pageState = {
      t: vi.fn((value) => value),
      classrooms: [{ id: 'class-1' }],
      meta: { nextAcademicYear: '2026-2027' },
      classroomsState: { loading: false, error: null },
      name: '8-A',
      academicYear: '2025-2026',
      academicYearOptions: ['2026-2027', '2025-2026'],
      selectedClassroom: { id: 'class-1' },
      studentSearchInput: 'Ali',
      studentsState: { rows: [] },
      annualModalOpen: true,
      annualPreviewState: { preview: { promoteCount: 10 }, loading: false, error: null },
      confirmState: { open: true },
      confirmConfig: { title: 'Confirm', message: 'Run?' },
      createLoading: false,
      removeLoading: true,
      annualActionLoading: false,
      onNameChange: vi.fn(),
      onNameBlur: vi.fn(),
      onAcademicYearChange: vi.fn(),
      onSelectNextAcademicYear: vi.fn(),
      onCreateClassroom: vi.fn(),
      onOpenStudentModal: vi.fn(),
      onCloseStudentModal: vi.fn(),
      onStudentSearchChange: vi.fn(),
      onStudentSearchSubmit: vi.fn(),
      onStudentPageChange: vi.fn(),
      onOpenStudentDetail: vi.fn(),
      onOpenAnnualModal: vi.fn(),
      onCloseAnnualModal: vi.fn(),
      onRefreshAnnualPreview: vi.fn(),
      onRequestRemoveStudent: vi.fn(),
      onRequestRunAnnualPromotion: vi.fn(),
      onConfirm: vi.fn(),
      onCancelConfirm: vi.fn(),
    };

    const vm = buildAdminClassroomsWorkspaceModel(pageState);

    expect(vm.classrooms).toHaveLength(1);
    expect(vm.createForm.name).toBe('8-A');
    expect(vm.studentsModal.open).toBe(true);
    expect(vm.annualModal.open).toBe(true);
    expect(vm.confirmModal.loading).toBe(true);
    expect(vm.onOpenClassroom).toBe(pageState.onOpenStudentModal);
  });
});
