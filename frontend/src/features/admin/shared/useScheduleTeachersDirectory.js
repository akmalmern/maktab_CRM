import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../lib/apiClient';

export const EMPTY_SCHEDULE_TEACHERS_STATE = {
  items: [],
  total: 0,
  loading: false,
  partial: false,
  error: null,
};

export default function useScheduleTeachersDirectory({ enabled, fetchTeachersPage, baseQuery }) {
  const [scheduleTeachersState, setScheduleTeachersState] = useState(EMPTY_SCHEDULE_TEACHERS_STATE);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    async function loadAllScheduleTeachers() {
      setScheduleTeachersState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      const accumulated = [];
      let total = 0;
      let page = 1;
      const limit = 100;

      try {
        while (true) {
          const response = await fetchTeachersPage(
            { ...baseQuery, page, limit },
            true,
          ).unwrap();
          const rows = response?.teachers || [];
          const pages = Math.max(Number(response?.pages || 1), 1);
          total = Number(response?.total || 0);
          accumulated.push(...rows);
          if (!rows.length || accumulated.length >= total || page >= pages) break;
          page += 1;
        }
        if (cancelled) return;
        setScheduleTeachersState({
          items: accumulated,
          total,
          loading: false,
          partial: accumulated.length < total,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setScheduleTeachersState({
          items: accumulated,
          total,
          loading: false,
          partial: true,
          error: getErrorMessage(error),
        });
      }
    }

    loadAllScheduleTeachers();
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchTeachersPage, baseQuery]);

  return enabled ? scheduleTeachersState : EMPTY_SCHEDULE_TEACHERS_STATE;
}
