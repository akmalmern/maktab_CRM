import { describe, expect, it } from 'vitest';
import {
  buildTeacherScheduleSummary,
  countWeekdayInMonth,
  getSlotDurationMinutes,
} from './teacherScheduleModel';

describe('teacherScheduleModel', () => {
  it('getSlotDurationMinutes vaqt oralig\'i davomiyligini hisoblaydi', () => {
    expect(
      getSlotDurationMinutes({
        boshlanishVaqti: '08:00',
        tugashVaqti: '09:30',
      }),
    ).toBe(90);
  });

  it('countWeekdayInMonth oy ichidagi hafta kunlari sonini topadi', () => {
    expect(countWeekdayInMonth('2026-03', 1)).toBe(5);
    expect(countWeekdayInMonth('2026-03', 5)).toBe(4);
  });

  it('buildTeacherScheduleSummary haftalik va oylik yuklamani hisoblaydi', () => {
    const result = buildTeacherScheduleSummary(
      [
        {
          haftaKuni: 'DUSHANBA',
          vaqtOraliq: { boshlanishVaqti: '08:00', tugashVaqti: '09:00' },
        },
        {
          haftaKuni: 'JUMA',
          vaqtOraliq: { boshlanishVaqti: '10:00', tugashVaqti: '11:30' },
        },
      ],
      '2026-03',
    );

    expect(result.weeklyLessonCount).toBe(2);
    expect(result.weeklyHours).toBe(2.5);
    expect(result.monthlyLessonCount).toBe(9);
    expect(result.monthlyHours).toBe(11);
  });
});
