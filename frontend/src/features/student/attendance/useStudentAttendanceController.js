import { useCallback, useMemo, useState } from 'react';
import { getLocalDateInputValue } from '../../../lib/dateUtils';
import { useGetStudentAttendanceQuery } from '../../../services/api/studentApi';
import { buildStudentAttendanceQuery } from './studentAttendanceModel';

export default function useStudentAttendanceController() {
  const [sana, setSana] = useState(getLocalDateInputValue());
  const [periodType, setPeriodType] = useState('OYLIK');
  const [holat, setHolat] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryArgs = useMemo(
    () =>
      buildStudentAttendanceQuery({
        sana,
        periodType,
        holat,
        page,
        limit,
      }),
    [holat, limit, page, periodType, sana],
  );

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetStudentAttendanceQuery(queryArgs);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSanaChange = useCallback((nextSana) => {
    setSana(nextSana);
    setPage(1);
  }, []);

  const handlePeriodTypeChange = useCallback((nextPeriodType) => {
    setPeriodType(nextPeriodType);
    setPage(1);
  }, []);

  const handleHolatChange = useCallback((nextHolat) => {
    setHolat(nextHolat);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setPeriodType('OYLIK');
    setHolat('ALL');
    setLimit(20);
    setPage(1);
  }, []);

  return {
    sana,
    periodType,
    holat,
    page: data?.page || page,
    limit: data?.limit || limit,
    pages: data?.pages || 1,
    total: data?.total || 0,
    data: data || null,
    loading: isLoading || (!data && isFetching),
    fetching: isFetching,
    error: error?.message || '',
    handleSanaChange,
    handlePeriodTypeChange,
    handleHolatChange,
    handleLimitChange,
    setPage,
    resetFilters,
    refresh,
  };
}
