import { AttendanceReports } from '../../../../components/admin';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetAdminAttendanceReportQuery } from '../../../../services/api/attendanceApi';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PERIOD_SET = new Set(['KUNLIK', 'HAFTALIK', 'OYLIK', 'CHORAKLIK', 'YILLIK']);
const HOLAT_SET = new Set(['ALL', 'KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ']);

function normalizeAttendanceQuery(raw = {}) {
  const sana = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.sana || '')) ? String(raw.sana) : todayStr();
  const periodType = PERIOD_SET.has(raw.periodType) ? raw.periodType : 'OYLIK';
  const classroomId = raw.classroomId && raw.classroomId !== 'all' ? String(raw.classroomId) : 'all';
  const holat = HOLAT_SET.has(raw.holat) ? raw.holat : 'ALL';
  const page = Math.max(1, Number.parseInt(String(raw.page || 1), 10) || 1);
  const limit = Math.min(Math.max(1, Number.parseInt(String(raw.limit || 20), 10) || 20), 200);
  const view = raw.view === 'history' ? 'history' : 'report';
  return { sana, periodType, classroomId, holat, page, limit, view };
}

function readAttendanceQueryFromSearchParams(searchParams) {
  return normalizeAttendanceQuery({
    sana: searchParams.get('attendanceDate') || '',
    periodType: searchParams.get('attendancePeriodType') || 'OYLIK',
    classroomId: searchParams.get('attendanceClassroomId') || 'all',
    holat: searchParams.get('attendanceHolat') || 'ALL',
    page: searchParams.get('attendancePage') || 1,
    limit: searchParams.get('attendanceLimit') || 20,
    view: searchParams.get('attendanceView') || 'report',
  });
}

function writeAttendanceQueryToSearchParams(currentSearchParams, query) {
  const params = new URLSearchParams(currentSearchParams);
  const setOrDelete = (key, value, defaultValue = '') => {
    if (value === undefined || value === null || value === '' || value === defaultValue) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  };
  setOrDelete('attendanceDate', query.sana, todayStr());
  setOrDelete('attendancePeriodType', query.periodType, 'OYLIK');
  setOrDelete('attendanceClassroomId', query.classroomId, 'all');
  setOrDelete('attendanceHolat', query.holat, 'ALL');
  setOrDelete('attendancePage', query.page, 1);
  setOrDelete('attendanceLimit', query.limit, 20);
  setOrDelete('attendanceView', query.view, 'report');
  return params;
}

export default function AttendanceSection({
  classrooms,
  onExport,
  exporting,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(
    () => readAttendanceQueryFromSearchParams(searchParams),
    [searchParams],
  );
  const apiParams = useMemo(
    () => ({
      sana: query.sana,
      periodType: query.periodType,
      ...(query.classroomId !== 'all' ? { classroomId: query.classroomId } : {}),
      ...(query.holat !== 'ALL' ? { holat: query.holat } : {}),
      page: query.page,
      limit: query.limit,
    }),
    [query],
  );
  const attendanceQuery = useGetAdminAttendanceReportQuery(apiParams);
  const handleFetch = useCallback(
    (patch = {}) => {
      const nextQuery = normalizeAttendanceQuery({ ...query, ...patch });
      const nextSearchParams = writeAttendanceQueryToSearchParams(searchParams, nextQuery);
      if (nextSearchParams.toString() !== searchParams.toString()) {
        setSearchParams(nextSearchParams, { replace: true });
      }
    },
    [query, searchParams, setSearchParams],
  );

  return (
    <div className="space-y-4">
      <AttendanceReports
        classrooms={classrooms}
        loading={attendanceQuery.isLoading || attendanceQuery.isFetching}
        error={attendanceQuery.error?.message || null}
        report={attendanceQuery.data || null}
        query={query}
        onFetch={handleFetch}
        onExport={onExport}
        exporting={exporting}
      />
    </div>
  );
}
