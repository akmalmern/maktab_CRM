import { describe, expect, it } from 'vitest';
import {
  buildAcademicYearOptions,
  collapseDraftName,
  formatClassroomLabel,
  getPreferredAcademicYear,
} from './classroomViewModel';

describe('classroomViewModel', () => {
  it('prefers server-provided academic years over derived classroom years', () => {
    const result = buildAcademicYearOptions(
      {
        allowedAcademicYears: ['2026-2027', '2025-2026'],
        currentAcademicYear: '2026-2027',
      },
      [{ academicYear: '2024-2025' }],
    );

    expect(result).toEqual(['2026-2027', '2025-2026']);
  });

  it('returns current academic year when it is allowed', () => {
    const result = getPreferredAcademicYear({
      allowedAcademicYears: ['2026-2027', '2025-2026'],
      currentAcademicYear: '2025-2026',
    });

    expect(result).toBe('2025-2026');
  });

  it('collapses duplicate spaces in draft classroom names', () => {
    expect(collapseDraftName(' 10-  FizMat  ')).toBe('10- FizMat');
  });

  it('formats classroom labels consistently', () => {
    expect(formatClassroomLabel({ name: '8-A', academicYear: '2026-2027' })).toBe(
      '8-A (2026-2027)',
    );
  });
});
