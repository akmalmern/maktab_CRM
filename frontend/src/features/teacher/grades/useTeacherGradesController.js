import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useGetTeacherGradesQuery,
  useGetTeacherScheduleQuery,
} from '../../../services/api/teacherApi';
import {
  BAHO_TURI_OPTIONS,
  buildTeacherGradesQuery,
  deriveTeacherGradeClassrooms,
} from './teacherGradesModel';

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readTeacherGradesQueryState(searchParams) {
  const bahoTuri = searchParams.get('bahoTuri') || 'ALL';
  const limit = readPositiveInt(searchParams.get('limit'), 20);

  return {
    sana: searchParams.get('sana') || '',
    bahoTuri: BAHO_TURI_OPTIONS.includes(bahoTuri) ? bahoTuri : 'ALL',
    classroomId: searchParams.get('classroomId') || 'ALL',
    page: readPositiveInt(searchParams.get('page'), 1),
    limit: [20, 50, 100].includes(limit) ? limit : 20,
  };
}

export default function useTeacherGradesController() {
  const [searchParams] = useSearchParams();
  const initialState = useMemo(() => readTeacherGradesQueryState(searchParams), [searchParams]);
  const [sana, setSana] = useState(initialState.sana);
  const [bahoTuri, setBahoTuri] = useState(initialState.bahoTuri);
  const [classroomId, setClassroomId] = useState(initialState.classroomId);
  const [page, setPage] = useState(initialState.page);
  const [limit, setLimit] = useState(initialState.limit);

  const queryArgs = useMemo(
    () =>
      buildTeacherGradesQuery({
        sana,
        bahoTuri,
        classroomId,
        page,
        limit,
      }),
    [bahoTuri, classroomId, limit, page, sana],
  );

  const gradesQuery = useGetTeacherGradesQuery(queryArgs);
  const scheduleQuery = useGetTeacherScheduleQuery({});
  const classrooms = useMemo(
    () => deriveTeacherGradeClassrooms(scheduleQuery.data?.darslar || []),
    [scheduleQuery.data?.darslar],
  );

  const refresh = useCallback(() => {
    gradesQuery.refetch();
    scheduleQuery.refetch();
  }, [gradesQuery, scheduleQuery]);

  const handleSanaChange = useCallback((nextSana) => {
    setSana(nextSana);
    setPage(1);
  }, []);

  const handleBahoTuriChange = useCallback((nextBahoTuri) => {
    setBahoTuri(nextBahoTuri);
    setPage(1);
  }, []);

  const handleClassroomChange = useCallback((nextClassroomId) => {
    setClassroomId(nextClassroomId);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSana('');
    setClassroomId('ALL');
    setBahoTuri('ALL');
    setLimit(20);
    setPage(1);
  }, []);

  return {
    sana,
    bahoTuri,
    classroomId,
    limit: gradesQuery.data?.limit || limit,
    page: gradesQuery.data?.page || page,
    pages: gradesQuery.data?.pages || 1,
    total: gradesQuery.data?.total || 0,
    classrooms,
    data: gradesQuery.data || null,
    loading: gradesQuery.isLoading || (!gradesQuery.data && gradesQuery.isFetching),
    error: gradesQuery.error?.message || '',
    handleSanaChange,
    handleBahoTuriChange,
    handleClassroomChange,
    handleLimitChange,
    setPage,
    resetFilters,
    refresh,
  };
}
