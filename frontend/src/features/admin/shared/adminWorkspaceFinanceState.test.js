import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FINANCE_QUERY,
  normalizeFinanceQuery,
  readFinanceQueryFromSearchParams,
  syncFinanceSearchParams,
} from './adminWorkspaceFinanceState';

describe('adminWorkspaceFinanceState', () => {
  it('normalizes invalid finance query values to defaults', () => {
    expect(
      normalizeFinanceQuery({
        search: '  ali',
        page: '0',
        limit: '-5',
        status: 'UNKNOWN',
        classroomId: 'all',
        debtMonth: 'BAD',
        debtTargetMonth: '2026-13',
        cashflowMonth: 'abc',
      }),
    ).toEqual({
      ...DEFAULT_FINANCE_QUERY,
      search: 'ali',
    });
  });

  it('reads finance query from URLSearchParams', () => {
    const params = new URLSearchParams({
      search: 'student',
      page: '3',
      limit: '50',
      status: 'QARZDOR',
      classroomId: 'class-1',
      debtMonth: 'CURRENT',
      debtTargetMonth: '2026-03',
      cashflowMonth: '2026-02',
    });

    expect(readFinanceQueryFromSearchParams(params)).toEqual({
      search: 'student',
      page: 3,
      limit: 50,
      status: 'QARZDOR',
      classroomId: 'class-1',
      debtMonth: 'CURRENT',
      debtTargetMonth: '2026-03',
      cashflowMonth: '2026-02',
    });
  });

  it('syncs only non-default values into URLSearchParams', () => {
    const params = syncFinanceSearchParams(new URLSearchParams('foo=bar'), {
      ...DEFAULT_FINANCE_QUERY,
      search: 'ali',
      classroomId: 'class-9',
      debtMonth: 'PREVIOUS',
    });

    expect(params.toString()).toBe('foo=bar&search=ali&classroomId=class-9&debtMonth=PREVIOUS');
  });
});
