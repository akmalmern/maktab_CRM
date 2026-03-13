import { useMemo } from 'react';
import { buildSelectedRunTeacherRows, paginateRows } from './payrollSectionModel';

export function usePayrollRunItems({ selectedRun, teachers, lineFilters }) {
  const selectedRunTeacherRows = useMemo(
    () => buildSelectedRunTeacherRows({ selectedRun, teachers }),
    [selectedRun, teachers],
  );

  const pagedRunItems = useMemo(
    () => paginateRows(selectedRunTeacherRows, lineFilters),
    [selectedRunTeacherRows, lineFilters],
  );

  return {
    selectedRunTeacherRows,
    pagedRunItems,
  };
}
