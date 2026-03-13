import { describe, expect, it } from 'vitest';
import {
  buildFinanceStudentsParams,
  buildFinanceSummaryParams,
  isAllClassroomsFinanceView,
  toFinanceClassroomParam,
} from './financeQueryParams';

describe('financeQueryParams', () => {
  const baseQuery = {
    page: 1,
    limit: 20,
    status: 'ALL',
    classroomId: 'all',
    debtMonth: 'ALL',
    debtTargetMonth: '',
    cashflowMonth: '',
  };

  it('keeps all-classrooms view as undefined classroomId for API', () => {
    const params = buildFinanceStudentsParams(baseQuery, '');
    expect(params.classroomId).toBeUndefined();
    expect(isAllClassroomsFinanceView(baseQuery.classroomId)).toBe(true);
  });

  it('passes selected classroom id to API when a class is selected', () => {
    const params = buildFinanceStudentsParams(
      { ...baseQuery, classroomId: 'class_123' },
      'ali',
    );
    expect(params.classroomId).toBe('class_123');
    expect(params.search).toBe('ali');
    expect(isAllClassroomsFinanceView(params.classroomId)).toBe(false);
  });

  it('builds summary params same as students params in all-classrooms mode', () => {
    const studentsParams = buildFinanceStudentsParams(baseQuery, 'search');
    const summaryParams = buildFinanceSummaryParams(baseQuery, 'search');
    expect(summaryParams).toEqual(studentsParams);
    expect(toFinanceClassroomParam('all')).toBeUndefined();
  });
});

