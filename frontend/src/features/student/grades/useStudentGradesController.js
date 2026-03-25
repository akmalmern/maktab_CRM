import { useCallback, useMemo, useState } from 'react';
import {
  useGetStudentClassGradesQuery,
  useGetStudentGradesQuery,
} from '../../../services/api/studentApi';
import { buildStudentGradesQuery } from './studentGradesModel';

export default function useStudentGradesController() {
  const [sana, setSana] = useState('');
  const [bahoTuri, setBahoTuri] = useState('ALL');
  const [activeView, setActiveView] = useState('mine');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryArgs = useMemo(
    () =>
      buildStudentGradesQuery({
        sana,
        bahoTuri,
        page,
        limit,
      }),
    [bahoTuri, limit, page, sana],
  );

  const myGradesQuery = useGetStudentGradesQuery(queryArgs, {
    skip: activeView !== 'mine',
  });
  const classGradesQuery = useGetStudentClassGradesQuery(queryArgs, {
    skip: activeView !== 'class',
  });

  const activeQuery = activeView === 'mine' ? myGradesQuery : classGradesQuery;
  const data = activeQuery.data || null;
  const loading = activeQuery.isLoading || (!data && activeQuery.isFetching);
  const error = activeQuery.error?.message || '';

  const handleSanaChange = useCallback((nextSana) => {
    setSana(nextSana);
    setPage(1);
  }, []);

  const handleBahoTuriChange = useCallback((nextBahoTuri) => {
    setBahoTuri(nextBahoTuri);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const handleActiveViewChange = useCallback((nextView) => {
    setActiveView(nextView);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    activeQuery.refetch();
  }, [activeQuery]);

  const resetFilters = useCallback(() => {
    setSana('');
    setBahoTuri('ALL');
    setLimit(20);
    setPage(1);
  }, []);

  return {
    sana,
    bahoTuri,
    activeView,
    page: data?.page || page,
    limit: data?.limit || limit,
    pages: data?.pages || 1,
    total: data?.total || 0,
    data,
    loading,
    error,
    handleSanaChange,
    handleBahoTuriChange,
    handleLimitChange,
    handleActiveViewChange,
    setPage,
    resetFilters,
    refresh,
  };
}
