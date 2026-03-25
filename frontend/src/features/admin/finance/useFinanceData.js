import { useMemo } from 'react';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import {
  useGetFinanceSettingsQuery,
  useGetFinanceStudentsQuery,
} from '../../../services/api/financeApi';
import {
  normalizeAdminFinanceSettings,
  normalizeAdminFinanceStudentsState,
  normalizeClassroomList,
} from '../../shared/finance/financeReadModel';

export default function useFinanceData({ financeStudentsParams, financeQueryLimit }) {
  const classroomsQuery = useGetClassroomsQuery();
  const financeSettingsQuery = useGetFinanceSettingsQuery();
  const financeStudentsQuery = useGetFinanceStudentsQuery(financeStudentsParams);

  const financeSettingsState = useMemo(
    () => normalizeAdminFinanceSettings(financeSettingsQuery.data),
    [financeSettingsQuery.data],
  );

  const financeStudentsState = useMemo(
    () =>
      normalizeAdminFinanceStudentsState({
        data: financeStudentsQuery.data,
        loading: financeStudentsQuery.isLoading || financeStudentsQuery.isFetching,
        error: financeStudentsQuery.error,
        fallbackLimit: financeQueryLimit,
      }),
    [
      financeQueryLimit,
      financeStudentsQuery.data,
      financeStudentsQuery.error,
      financeStudentsQuery.isFetching,
      financeStudentsQuery.isLoading,
    ],
  );

  return {
    classrooms: normalizeClassroomList(classroomsQuery.data),
    financeSettings: financeSettingsState.settings,
    financeSettingsMeta: financeSettingsState.meta,
    financeStudentsState,
  };
}
