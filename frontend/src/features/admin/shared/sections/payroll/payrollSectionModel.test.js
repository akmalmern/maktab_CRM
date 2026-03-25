import { describe, expect, it } from 'vitest';
import {
  buildRatesDatasetQuery,
  buildOwnerKey,
  buildSelectedRunTeacherRows,
  createRatesDataset,
  mergeRatesDatasetPage,
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

  it('merges rates dataset page without duplicates when loading next pages', () => {
    const initial = createRatesDataset();
    const first = mergeRatesDatasetPage(
      initial,
      {
        rates: [{ id: 'r1' }, { id: 'r2' }],
        total: 3,
        pages: 2,
      },
      1,
    );
    const second = mergeRatesDatasetPage(
      first,
      {
        rates: [{ id: 'r2' }, { id: 'r3' }],
        total: 3,
        pages: 2,
      },
      2,
    );

    expect(second.rates.map((row) => row.id)).toEqual(['r1', 'r2', 'r3']);
    expect(second.page).toBe(2);
    expect(second.partial).toBe(false);
  });

  it('builds rates query view from dataset', () => {
    const dataset = {
      rates: [{ id: 'r1' }],
      page: 1,
      pages: 2,
      total: 3,
      loading: false,
      error: null,
      partial: true,
    };

    const query = buildRatesDatasetQuery(dataset);
    expect(query.data.rates).toHaveLength(1);
    expect(query.hasMore).toBe(true);
    expect(query.partial).toBe(true);
    expect(query.error).toBeNull();
  });
});
