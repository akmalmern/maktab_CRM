import { AttendanceReports } from '../../../../components/admin';

export default function AttendanceSection({
  classrooms,
  loading,
  error,
  report,
  onFetch,
  onExport,
  exporting,
}) {
  return (
    <AttendanceReports
      classrooms={classrooms}
      loading={loading}
      error={error}
      report={report}
      onFetch={onFetch}
      onExport={onExport}
      exporting={exporting}
    />
  );
}
