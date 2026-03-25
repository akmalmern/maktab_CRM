import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildFinanceStudentsParams } from '../shared/financeQueryParams';
import {
  DEFAULT_FINANCE_QUERY,
  normalizeFinanceQuery,
  readFinanceQueryFromSearchParams,
  syncFinanceSearchParams,
} from '../shared/adminWorkspaceFinanceState';

const FINANCE_SEARCH_DEBOUNCE_MS = 350;

export default function useFinanceQueryController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const financeQuery = useMemo(
    () =>
      normalizeFinanceQuery({
        ...DEFAULT_FINANCE_QUERY,
        ...readFinanceQueryFromSearchParams(searchParams),
      }),
    [searchParams],
  );
  const [debouncedFinanceSearch, setDebouncedFinanceSearch] = useState(() => financeQuery.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFinanceSearch(financeQuery.search);
    }, FINANCE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [financeQuery.search]);

  const handleFinanceQueryChange = useCallback((patch) => {
    const next = normalizeFinanceQuery({ ...financeQuery, ...patch });
    const nextParams = syncFinanceSearchParams(searchParams, next);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [financeQuery, searchParams, setSearchParams]);

  return {
    financeQuery,
    financeStudentsParams: buildFinanceStudentsParams(financeQuery, debouncedFinanceSearch),
    handleFinanceQueryChange,
  };
}
