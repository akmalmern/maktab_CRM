import { describe, expect, it } from 'vitest';
import { buildAdminScheduleSectionViewModel } from './adminScheduleSectionModel';

describe('buildAdminScheduleSectionViewModel', () => {
  it('maps schedule page state into section view model', () => {
    const vm = buildAdminScheduleSectionViewModel({
      classrooms: [{ id: 'class-1' }],
      subjects: [{ id: 'subject-1' }],
      teachers: [{ id: 'teacher-1' }],
      teachersState: { loading: false, error: null, items: [{ id: 'teacher-1' }] },
    });

    expect(vm.data.classrooms).toHaveLength(1);
    expect(vm.data.subjects).toHaveLength(1);
    expect(vm.data.teachers).toHaveLength(1);
    expect(vm.data.teachersState.loading).toBe(false);
  });
});
