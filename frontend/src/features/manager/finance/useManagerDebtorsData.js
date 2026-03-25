import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetManagerClassroomsQuery,
  useGetManagerDebtorsQuery,
} from '../../../services/api/managerApi';
import {
  buildManagerDebtorSummaryCards,
  createManagerStudentsState,
  normalizeClassroomList,
  normalizeManagerGlobalSummaryState,
  normalizeManagerStudentsState,
} from '../../shared/finance/financeReadModel';
import {
  formatMoney,
  MANAGER_DEBTORS_LIMIT,
  managerSelectedClassRecordsLabel,
} from './managerDebtorsModel';

export default function useManagerDebtorsData({ t, locale, language }) {
  const [query, setQuery] = useState({
    classroomId: '',
    page: 1,
    limit: MANAGER_DEBTORS_LIMIT,
  });

  const classroomsQuery = useGetManagerClassroomsQuery();
  const classrooms = useMemo(
    () => normalizeClassroomList(classroomsQuery.data),
    [classroomsQuery.data],
  );
  const defaultClassroomId = classrooms?.[0]?.id || '';
  const activeClassroomId = query.classroomId || defaultClassroomId;
  const activeQuery = useMemo(
    () => ({
      ...query,
      classroomId: activeClassroomId,
    }),
    [activeClassroomId, query],
  );
  const globalSummaryQuery = useGetManagerDebtorsQuery({ page: 1, limit: 1 });
  const studentsQuery = useGetManagerDebtorsQuery(
    {
      page: query.page,
      limit: query.limit,
      classroomId: activeClassroomId,
    },
    {
      skip: !activeClassroomId,
    },
  );

  useEffect(() => {
    if (!classroomsQuery.error?.message) return;
    toast.error(classroomsQuery.error.message || t("Sinflar olinmadi"));
  }, [classroomsQuery.error?.message, t]);

  const globalSummaryState = useMemo(
    () =>
      normalizeManagerGlobalSummaryState({
        data: globalSummaryQuery.data,
        loading: globalSummaryQuery.isLoading || globalSummaryQuery.isFetching,
        error: globalSummaryQuery.error,
      }),
    [
      globalSummaryQuery.data,
      globalSummaryQuery.error,
      globalSummaryQuery.isFetching,
      globalSummaryQuery.isLoading,
    ],
  );

  const studentsState = useMemo(() => {
    if (!activeClassroomId) {
      return {
        ...createManagerStudentsState(),
        loading: false,
      };
    }

    return normalizeManagerStudentsState({
      data: studentsQuery.data,
      loading: studentsQuery.isLoading || studentsQuery.isFetching,
      error: studentsQuery.error,
    });
  }, [
    activeClassroomId,
    studentsQuery.data,
    studentsQuery.error,
    studentsQuery.isFetching,
    studentsQuery.isLoading,
  ]);

  const summaryCards = useMemo(
    () =>
      buildManagerDebtorSummaryCards({
        globalSummaryState,
        selectedTotal: studentsState.total,
        selectedRecordsLabel: managerSelectedClassRecordsLabel(language),
        locale,
        t,
        formatMoney,
      }),
    [
      globalSummaryState,
      language,
      locale,
      studentsState.total,
      t,
    ],
  );

  function reloadDebtors() {
    classroomsQuery.refetch();
    globalSummaryQuery.refetch();
    if (activeClassroomId) {
      studentsQuery.refetch();
    }
  }

  function resetQuery() {
    setQuery((prev) => ({
      ...prev,
      classroomId: classrooms?.[0]?.id || '',
      page: 1,
      limit: MANAGER_DEBTORS_LIMIT,
    }));
  }

  return {
    classrooms,
    query: activeQuery,
    setQuery,
    studentsState,
    globalSummaryState,
    summaryCards,
    reloadDebtors,
    resetQuery,
  };
}
