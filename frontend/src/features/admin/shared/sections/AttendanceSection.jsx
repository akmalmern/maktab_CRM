import { AttendanceReports } from '../../../../components/admin';
import { useState } from 'react';
import { useGetAdminAttendanceReportQuery } from '../../../../services/api/attendanceApi';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendanceSection({
  classrooms,
  onExport,
  exporting,
}) {
  const [params, setParams] = useState({ sana: todayStr() });
  const attendanceQuery = useGetAdminAttendanceReportQuery(params);

  return (
    <div className="space-y-4">
      <AttendanceReports
        classrooms={classrooms}
        loading={attendanceQuery.isLoading || attendanceQuery.isFetching}
        error={attendanceQuery.error?.message || null}
        report={attendanceQuery.data || null}
        onFetch={setParams}
        onExport={onExport}
        exporting={exporting}
      />
    </div>
  );
}
