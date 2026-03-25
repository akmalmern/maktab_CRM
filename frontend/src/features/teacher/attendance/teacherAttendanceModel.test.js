import { describe, expect, it } from 'vitest';
import {
  buildTeacherAttendanceSavePayload,
  normalizeTeacherAttendanceDetail,
} from './teacherAttendanceModel';

describe('teacherAttendanceModel', () => {
  it('normalizeTeacherAttendanceDetail student defaultsini tozalaydi', () => {
    const result = normalizeTeacherAttendanceDetail({
      students: [
        {
          id: 'student_1',
          fullName: 'Ali Valiyev',
        },
      ],
    });

    expect(result.students[0]).toMatchObject({
      holat: 'KELDI',
      bahoBall: '',
      bahoMaxBall: 5,
      bahoTuri: 'JORIY',
    });
  });

  it("buildTeacherAttendanceSavePayload grade delete va numeric payloadni to'g'ri quradi", () => {
    const result = buildTeacherAttendanceSavePayload({
      sana: '2026-03-02',
      students: [
        {
          id: 'student_1',
          holat: 'KELDI',
          bahoBall: '4',
          bahoMaxBall: '5',
          bahoTuri: 'JORIY',
        },
        {
          id: 'student_2',
          holat: 'SABABLI',
          bahoBall: null,
          bahoTuri: 'YAKUNIY',
        },
      ],
    });

    expect(result).toEqual({
      sana: '2026-03-02',
      davomatlar: [
        {
          studentId: 'student_1',
          holat: 'KELDI',
          bahoBall: 4,
          bahoMaxBall: 5,
          bahoTuri: 'JORIY',
        },
        {
          studentId: 'student_2',
          holat: 'SABABLI',
          bahoBall: null,
          bahoTuri: 'YAKUNIY',
        },
      ],
    });
  });
});
