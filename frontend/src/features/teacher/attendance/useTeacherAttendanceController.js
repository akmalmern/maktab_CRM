import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getLocalDateInputValue } from '../../../lib/dateUtils';
import {
  useGetTeacherAttendanceDarsDetailQuery,
  useGetTeacherAttendanceDarslarQuery,
  useGetTeacherAttendanceHistoryQuery,
  useSaveTeacherAttendanceDarsMutation,
} from '../../../services/api/teacherApi';
import {
  buildTeacherAttendanceSavePayload,
  normalizeTeacherAttendanceDetail,
} from './teacherAttendanceModel';

function mergeDetailWithEdits(baseDetail, sessionEdits) {
  if (!baseDetail) return null;
  if (!sessionEdits || !Object.keys(sessionEdits).length) return baseDetail;

  return {
    ...baseDetail,
    students: baseDetail.students.map((student) => ({
      ...student,
      ...(sessionEdits[student.id] || {}),
    })),
  };
}

export default function useTeacherAttendanceController() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const querySana = searchParams.get('sana');
  const queryDarsId = searchParams.get('darsId');

  const [sana, setSana] = useState(querySana || getLocalDateInputValue());
  const [activeView, setActiveView] = useState('journal');
  const [selectedOquvYili, setSelectedOquvYili] = useState('');
  const [selectedDarsIdDraft, setSelectedDarsIdDraft] = useState(queryDarsId || '');
  const [tarixPeriodType, setTarixPeriodType] = useState('OYLIK');
  const [tarixHolat, setTarixHolat] = useState('ALL');
  const [tarixPage, setTarixPage] = useState(1);
  const [tarixLimit, setTarixLimit] = useState(20);
  const [studentEditsBySession, setStudentEditsBySession] = useState({});
  const [saveTeacherAttendance, saveTeacherAttendanceState] = useSaveTeacherAttendanceDarsMutation();

  const darslarQuery = useGetTeacherAttendanceDarslarQuery(
    {
      sana,
      ...(selectedOquvYili ? { oquvYili: selectedOquvYili } : {}),
    },
    {
      skip: activeView !== 'journal',
    },
  );

  const darslar = useMemo(() => darslarQuery.data?.darslar || [], [darslarQuery.data?.darslar]);
  const oquvYillar = useMemo(
    () => darslarQuery.data?.oquvYillar || [],
    [darslarQuery.data?.oquvYillar],
  );
  const oquvYili = selectedOquvYili || darslarQuery.data?.oquvYili || '';
  const selectedDarsId = useMemo(() => {
    if (selectedDarsIdDraft && darslar.some((item) => item.id === selectedDarsIdDraft)) {
      return selectedDarsIdDraft;
    }
    return darslar[0]?.id || '';
  }, [darslar, selectedDarsIdDraft]);

  const detailQuery = useGetTeacherAttendanceDarsDetailQuery(
    {
      darsId: selectedDarsId,
      sana,
    },
    {
      skip: activeView !== 'journal' || !selectedDarsId,
    },
  );

  const detailSessionKey = `${selectedDarsId || 'none'}__${sana}`;
  const baseDetail = useMemo(
    () => (detailQuery.data ? normalizeTeacherAttendanceDetail(detailQuery.data) : null),
    [detailQuery.data],
  );
  const detail = useMemo(
    () => mergeDetailWithEdits(baseDetail, studentEditsBySession[detailSessionKey]),
    [baseDetail, detailSessionKey, studentEditsBySession],
  );

  const historyQuery = useGetTeacherAttendanceHistoryQuery(
    {
      sana,
      periodType: tarixPeriodType,
      ...(tarixHolat !== 'ALL' ? { holat: tarixHolat } : {}),
      page: tarixPage,
      limit: tarixLimit,
    },
    {
      skip: activeView !== 'history',
    },
  );

  const historyData = historyQuery.data;
  const historyPage = historyData?.page || tarixPage;
  const historyLimit = historyData?.limit || tarixLimit;
  const historyPages = historyData?.pages || 1;
  const journalLoading =
    darslarQuery.isLoading ||
    darslarQuery.isFetching ||
    Boolean(selectedDarsId && (detailQuery.isLoading || detailQuery.isFetching));
  const journalError = darslarQuery.error?.message || detailQuery.error?.message || '';
  const historyLoading = historyQuery.isLoading || historyQuery.isFetching;
  const historyError = historyQuery.error?.message || '';

  const handleSanaChange = useCallback(
    (nextSana) => {
      setSana(nextSana);
      if (activeView === 'history') {
        setTarixPage(1);
      }
    },
    [activeView],
  );

  const handleOquvYiliChange = useCallback((nextOquvYili) => {
    setSelectedOquvYili(nextOquvYili);
  }, []);

  const handleSelectedDarsIdChange = useCallback((nextDarsId) => {
    setSelectedDarsIdDraft(nextDarsId);
  }, []);

  const refreshJournal = useCallback(() => {
    darslarQuery.refetch();
    if (selectedDarsId) {
      detailQuery.refetch();
    }
  }, [darslarQuery, detailQuery, selectedDarsId]);

  const refreshHistory = useCallback(() => {
    historyQuery.refetch();
  }, [historyQuery]);

  const updateStudent = useCallback(
    (studentId, patch) => {
      if (!detailSessionKey) return;
      setStudentEditsBySession((prev) => ({
        ...prev,
        [detailSessionKey]: {
          ...(prev[detailSessionKey] || {}),
          [studentId]: {
            ...((prev[detailSessionKey] || {})[studentId] || {}),
            ...patch,
          },
        },
      }));
    },
    [detailSessionKey],
  );

  const applyBulkHolat = useCallback(
    (nextHolat) => {
      if (!detail?.students?.length) return;
      setStudentEditsBySession((prev) => {
        const nextSessionEdits = { ...(prev[detailSessionKey] || {}) };
        detail.students.forEach((student) => {
          nextSessionEdits[student.id] = {
            ...(nextSessionEdits[student.id] || {}),
            holat: nextHolat,
          };
        });
        return {
          ...prev,
          [detailSessionKey]: nextSessionEdits,
        };
      });
    },
    [detail, detailSessionKey],
  );

  const handleSave = useCallback(async () => {
    if (!selectedDarsId || !detail?.students?.length) {
      toast.warning(t("Saqlash uchun studentlar ro'yxati topilmadi"));
      return;
    }

    try {
      await saveTeacherAttendance({
        darsId: selectedDarsId,
        payload: buildTeacherAttendanceSavePayload({
          sana,
          students: detail.students,
        }),
      }).unwrap();
      setStudentEditsBySession((prev) => {
        const next = { ...prev };
        delete next[detailSessionKey];
        return next;
      });
      toast.success(t('Davomat saqlandi'));
    } catch (error) {
      toast.error(error?.message || t('Davomat saqlanmadi'));
    }
  }, [detail, detailSessionKey, sana, saveTeacherAttendance, selectedDarsId, t]);

  useEffect(() => {
    function onKeyDown(event) {
      if (activeView !== 'journal') return;
      if (!detail?.students?.length || saveTeacherAttendanceState.isLoading) return;
      if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeView, detail, handleSave, saveTeacherAttendanceState.isLoading]);

  return useMemo(
    () => ({
      activeView,
      sana,
      oquvYili,
      oquvYillar,
      darslar,
      selectedDarsId,
      detail,
      saving: saveTeacherAttendanceState.isLoading,
      journalLoading,
      journalError,
      tarixPeriodType,
      tarixHolat,
      tarixPage: historyPage,
      tarixLimit: historyLimit,
      tarixPages: historyPages,
      tarix: historyData?.tarix || [],
      tarixRange: historyData?.period || null,
      tarixTotal: historyData?.total || 0,
      historyLoading,
      historyError,
      setActiveView,
      setTarixPage,
      handleSanaChange,
      handleOquvYiliChange,
      handleSelectedDarsIdChange,
      setTarixPeriodType: (nextPeriodType) => {
        setTarixPeriodType(nextPeriodType);
        setTarixPage(1);
      },
      setTarixHolat: (nextHolat) => {
        setTarixHolat(nextHolat);
        setTarixPage(1);
      },
      setTarixLimit: (nextLimit) => {
        setTarixLimit(nextLimit);
        setTarixPage(1);
      },
      refreshJournal,
      refreshHistory,
      updateStudent,
      applyBulkHolat,
      handleSave,
    }),
    [
      activeView,
      applyBulkHolat,
      darslar,
      detail,
      handleOquvYiliChange,
      handleSanaChange,
      handleSave,
      handleSelectedDarsIdChange,
      historyData,
      historyError,
      historyLimit,
      historyLoading,
      historyPage,
      historyPages,
      journalError,
      journalLoading,
      oquvYili,
      oquvYillar,
      refreshHistory,
      refreshJournal,
      sana,
      saveTeacherAttendanceState.isLoading,
      selectedDarsId,
      tarixHolat,
      tarixPeriodType,
      updateStudent,
    ],
  );
}
