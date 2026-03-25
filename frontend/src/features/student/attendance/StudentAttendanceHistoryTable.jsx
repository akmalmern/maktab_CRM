import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  DataTable,
  StateView,
  StatusBadge,
} from '../../../components/ui';
import {
  bahoTuriLabel,
  formatStudentAttendanceBaho,
} from './studentAttendanceModel';

export default function StudentAttendanceHistoryTable({
  data,
  page,
  pages,
  onPageChange,
}) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      {
        key: 'oqituvchi',
        header: t("O'qituvchi"),
        render: (row) => row.oqituvchi,
      },
      {
        key: 'holat',
        header: t('Holat'),
        render: (row) => (
          <StatusBadge
            domain="attendance"
            value={row.holat}
            className="shadow-none"
          />
        ),
      },
      {
        key: 'baho',
        header: t('Baho'),
        render: (row) => formatStudentAttendanceBaho(row),
      },
      {
        key: 'bahoTuri',
        header: t('Baho turi'),
        render: (row) => bahoTuriLabel(t, row.bahoTuri),
      },
    ],
    [t],
  );

  return (
    <Card title={t('Davomat tarixi')}>
      {data?.tarix?.length ? (
        <>
          <DataTable
            columns={columns}
            rows={data.tarix}
            stickyHeader
            stickyFirstColumn
            density="compact"
            maxHeightClassName="max-h-[520px]"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              {t('Oldingi')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onPageChange(Math.min(pages, page + 1))}
              disabled={page >= pages}
            >
              {t('Keyingi')}
            </Button>
          </div>
        </>
      ) : (
        <StateView
          type="empty"
          description={t("Tanlangan period bo'yicha davomat topilmadi")}
        />
      )}
    </Card>
  );
}
