import { describe, expect, it } from 'vitest';
import {
  buildStudentAttendanceQuery,
  formatStudentAttendanceBaho,
} from './studentAttendanceModel';

describe('studentAttendanceModel', () => {
  it("buildStudentAttendanceQuery ALL holatini query'dan chiqaradi", () => {
    expect(
      buildStudentAttendanceQuery({
        sana: '2026-03-25',
        periodType: 'OYLIK',
        holat: 'ALL',
        page: 1,
        limit: 20,
      }),
    ).toEqual({
      sana: '2026-03-25',
      periodType: 'OYLIK',
      page: 1,
      limit: 20,
    });
  });

  it('formatStudentAttendanceBaho baho mavjud bo\'lsa nisbatni qaytaradi', () => {
    expect(formatStudentAttendanceBaho({ bahoBall: 4, bahoMaxBall: 5 })).toBe('4/5');
    expect(formatStudentAttendanceBaho({ bahoBall: null, bahoMaxBall: 5 })).toBe('-');
  });
});
