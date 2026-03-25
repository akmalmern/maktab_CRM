import { describe, expect, it } from 'vitest';
import {
  buildTeacherGradesQuery,
  deriveTeacherGradeClassrooms,
  isTeacherGradesFilterPristine,
} from './teacherGradesModel';

describe('teacherGradesModel', () => {
  it("buildTeacherGradesQuery 'ALL' filterlarni query'dan chiqaradi", () => {
    expect(
      buildTeacherGradesQuery({
        sana: '',
        bahoTuri: 'ALL',
        classroomId: 'ALL',
        page: 1,
        limit: 20,
      }),
    ).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('deriveTeacherGradeClassrooms darslardan unique sinflarni ajratadi', () => {
    expect(
      deriveTeacherGradeClassrooms([
        { sinf: { id: 'class_1', name: '7-A', academicYear: '2025-2026' } },
        { sinf: { id: 'class_1', name: '7-A', academicYear: '2025-2026' } },
        { sinf: { id: 'class_2', name: '8-B', academicYear: '2025-2026' } },
      ]),
    ).toEqual([
      { id: 'class_1', name: '7-A', academicYear: '2025-2026' },
      { id: 'class_2', name: '8-B', academicYear: '2025-2026' },
    ]);
  });

  it('isTeacherGradesFilterPristine default filter holatini aniqlaydi', () => {
    expect(
      isTeacherGradesFilterPristine({
        sana: '',
        classroomId: 'ALL',
        bahoTuri: 'ALL',
        limit: 20,
      }),
    ).toBe(true);

    expect(
      isTeacherGradesFilterPristine({
        sana: '2026-03-25',
        classroomId: 'ALL',
        bahoTuri: 'ALL',
        limit: 20,
      }),
    ).toBe(false);
  });
});
