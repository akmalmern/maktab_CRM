import { useMemo } from 'react';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Card } from '../../../../components/ui';
import { DashboardStats } from '../../../../components/admin';
import { useGetAdminAttendanceReportQuery } from '../../../../services/api/attendanceApi';
import { useGetClassroomsQuery } from '../../../../services/api/classroomsApi';
import { useGetTeachersQuery, useGetStudentsQuery } from '../../../../services/api/peopleApi';
import { useGetAdminDarsJadvaliQuery } from '../../../../services/api/scheduleApi';

const DAY_BY_JS = {
  1: 'DUSHANBA',
  2: 'SESHANBA',
  3: 'CHORSHANBA',
  4: 'PAYSHANBA',
  5: 'JUMA',
  6: 'SHANBA',
};

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

const DASHBOARD_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 1,
  filter: 'all',
  sort: 'name:asc',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardSection() {
  const jsDay = new Date().getDay();
  const haftaKuni = DAY_BY_JS[jsDay];
  const teachersQuery = useGetTeachersQuery(DASHBOARD_LIST_QUERY);
  const studentsQuery = useGetStudentsQuery(DASHBOARD_LIST_QUERY);
  const classroomsQuery = useGetClassroomsQuery();
  const attendanceQuery = useGetAdminAttendanceReportQuery({ sana: todayIso() });
  const darslarQuery = useGetAdminDarsJadvaliQuery();

  const attendanceReport = attendanceQuery.data || null;
  const headerStats = [
    { label: 'Teacherlar', value: teachersQuery.data?.total || 0 },
    { label: 'Studentlar', value: studentsQuery.data?.total || 0 },
    { label: 'Sinflar', value: (classroomsQuery.data?.classrooms || []).length || 0 },
  ];

  const todayLessons = useMemo(() => {
    if (!haftaKuni) return 0;
    const darslar = darslarQuery.data?.darslar || [];
    return darslar.filter((d) => d.haftaKuni === haftaKuni).length;
  }, [darslarQuery.data, haftaKuni]);

  const foizlar = attendanceReport?.foizlar || {};
  const snapshotStats = [
    { label: 'Bugungi darslar', value: todayLessons },
    { label: 'Davomat', value: pct(foizlar.kunlik) },
    { label: 'Haftalik foiz', value: pct(foizlar.haftalik) },
  ];

  return (
    <AutoTranslate>
      <div className="space-y-6">
        <DashboardStats stats={headerStats} />

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">
              Bugungi snapshot
            </h3>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              Live
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {snapshotStats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 ring-1 ring-slate-200/50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </AutoTranslate>
  );
}
