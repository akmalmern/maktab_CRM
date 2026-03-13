import { describe, expect, it } from 'vitest';
import {
  buildOwnerKey,
  buildSelectedRunTeacherRows,
  paginateRows,
  parseOwnerKey,
} from './payrollSectionModel';

describe('payrollSectionModel', () => {
  it('builds and parses owner keys', () => {
    expect(buildOwnerKey({ teacherId: 'teacher-1' })).toBe('teacher:teacher-1');
    expect(buildOwnerKey({ employeeId: 'employee-7' })).toBe('employee:employee-7');
    expect(parseOwnerKey('teacher:teacher-1')).toEqual({ teacherId: 'teacher-1' });
    expect(parseOwnerKey('employee:employee-7')).toEqual({ employeeId: 'employee-7' });
    expect(parseOwnerKey('')).toEqual({});
  });

  it('builds placeholder rows for teachers missing in selected run', () => {
    const teachers = [
      { id: 'teacher-1', subject: { id: 'subject-1', name: 'Algebra' } },
      { id: 'teacher-2', subject: { id: 'subject-2', name: 'Geografiya' } },
    ];
    const selectedRun = {
      items: [
        { id: 'item-1', teacherId: 'teacher-1', payableAmount: 120000, paidAmount: 0, paymentStatus: 'UNPAID' },
      ],
    };

    const rows = buildSelectedRunTeacherRows({ selectedRun, teachers });
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('item-1');
    expect(rows[1]).toMatchObject({
      id: 'placeholder:teacher-2',
      teacherId: 'teacher-2',
      paymentStatus: 'NOT_GENERATED',
      payableAmount: 0,
    });
  });

  it('paginates rows deterministically', () => {
    const rows = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }));
    const page = paginateRows(rows, { page: 3, limit: 10 });

    expect(page.page).toBe(3);
    expect(page.pages).toBe(5);
    expect(page.total).toBe(45);
    expect(page.rows).toHaveLength(10);
    expect(page.rows[0].id).toBe(21);
  });
});
