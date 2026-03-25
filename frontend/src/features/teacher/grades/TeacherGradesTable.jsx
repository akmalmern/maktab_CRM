import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, StateView, StatusBadge } from '../../../components/ui';

export default function TeacherGradesTable({
  data,
  page,
  pages,
  onPageChange,
}) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'student', header: t("O'quvchi"), render: (row) => row.student },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      {
        key: 'turi',
        header: t('Turi'),
        render: (row) => <StatusBadge domain="gradeType" value={row.turi} className="shadow-none" />,
      },
      { key: 'ball', header: t('Ball'), render: (row) => `${row.ball}/${row.maxBall}` },
    ],
    [t],
  );

  return (
    <Card title={t('Jami baholar: {{count}}', { count: data?.total || 0 })}>
      {data?.baholar?.length ? (
        <>
          <DataTable
            columns={columns}
            rows={data.baholar}
            stickyHeader
            stickyFirstColumn
            density="compact"
            maxHeightClassName="max-h-[560px]"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
        <StateView type="empty" description={t("Tanlangan filtr bo'yicha baholar topilmadi")} />
      )}
    </Card>
  );
}
