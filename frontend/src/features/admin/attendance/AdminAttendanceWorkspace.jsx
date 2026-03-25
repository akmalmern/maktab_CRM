import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import { useExportAttendanceReportMutation } from '../../../services/api/exportApi';
import { saveDownloadedFile } from '../../../lib/downloadUtils';
import { getErrorMessage } from '../../../lib/apiClient';
import AttendanceSection from '../shared/sections/AttendanceSection';

export default function AdminAttendanceWorkspace() {
  const { t } = useTranslation();
  const classroomsQuery = useGetClassroomsQuery();
  const [exportAttendanceReport] = useExportAttendanceReportMutation();
  const [exporting, setExporting] = useState('');

  const handleExportAttendance = useCallback(async (format, params) => {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportAttendanceReport({ format: safeFormat, params }).unwrap();
      const datePart = params?.sana || new Date().toISOString().slice(0, 10);
      saveDownloadedFile({
        blob,
        fileName,
        fallbackName: `davomat-hisobot-${datePart}.${safeFormat}`,
      });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }, [exportAttendanceReport, t]);

  return (
    <AttendanceSection
      classrooms={classroomsQuery.data?.classrooms || []}
      onExport={handleExportAttendance}
      exporting={exporting}
    />
  );
}
