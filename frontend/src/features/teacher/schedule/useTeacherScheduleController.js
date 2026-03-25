import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetTeacherScheduleQuery } from '../../../services/api/teacherApi';
import {
  buildTeacherScheduleSummary,
  currentMonthKey,
  sanaFromHaftaKuni,
} from './teacherScheduleModel';

export default function useTeacherScheduleController() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedOquvYili, setSelectedOquvYili] = useState('');
  const [monthKey, setMonthKey] = useState(currentMonthKey());

  const scheduleQuery = useGetTeacherScheduleQuery(
    selectedOquvYili ? { oquvYili: selectedOquvYili } : {},
  );

  const darslar = useMemo(() => scheduleQuery.data?.darslar || [], [scheduleQuery.data?.darslar]);
  const oquvYillar = useMemo(
    () => scheduleQuery.data?.oquvYillar || [],
    [scheduleQuery.data?.oquvYillar],
  );
  const oquvYili = selectedOquvYili || scheduleQuery.data?.oquvYili || '';
  const vaqtlar = useMemo(() => {
    const uniq = new Map();
    for (const dars of darslar) {
      if (dars.vaqtOraliq?.id && !uniq.has(dars.vaqtOraliq.id)) {
        uniq.set(dars.vaqtOraliq.id, dars.vaqtOraliq);
      }
    }
    return [...uniq.values()].sort((a, b) => (a.tartib || 0) - (b.tartib || 0));
  }, [darslar]);
  const gridMap = useMemo(() => {
    const map = new Map();
    for (const dars of darslar) {
      map.set(`${dars.haftaKuni}__${dars.vaqtOraliqId}`, dars);
    }
    return map;
  }, [darslar]);
  const loadSummary = useMemo(
    () => buildTeacherScheduleSummary(darslar, monthKey),
    [darslar, monthKey],
  );

  const refresh = useCallback(() => {
    scheduleQuery.refetch();
  }, [scheduleQuery]);

  const handleGoAttendance = useCallback(
    (dars) => {
      const sana = sanaFromHaftaKuni(dars.haftaKuni);
      navigate(`/teacher/davomat?sana=${encodeURIComponent(sana)}&darsId=${encodeURIComponent(dars.id)}`);
    },
    [navigate],
  );

  return {
    t,
    oquvYili,
    oquvYillar,
    monthKey,
    darslar,
    vaqtlar,
    gridMap,
    loadSummary,
    loading: scheduleQuery.isLoading || (!scheduleQuery.data && scheduleQuery.isFetching),
    error: scheduleQuery.error?.message || '',
    setOquvYili: setSelectedOquvYili,
    setMonthKey,
    refresh,
    handleGoAttendance,
  };
}
