import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../../components/ui';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const PERIOD_OPTIONS = ['KUNLIK', 'HAFTALIK', 'OYLIK', 'CHORAKLIK', 'YILLIK'];
const PERIOD_LABEL_KEYS = {
  KUNLIK: 'Kunlik',
  HAFTALIK: 'Haftalik',
  OYLIK: 'Oylik',
  CHORAKLIK: 'Choraklik',
  YILLIK: 'Yillik',
};

export default function AttendanceReports({
  classrooms,
  loading,
  error,
  report,
  onFetch,
  onExport,
  exporting,
}) {
  const { t } = useTranslation();
  const [sana, setSana] = useState(todayStr());
  const [classroomId, setClassroomId] = useState('all');
  const [periodType, setPeriodType] = useState('OYLIK');
  const [activeView, setActiveView] = useState('report');

  const percentCards = useMemo(
    () => [
      { label: t('Kunlik foiz'), value: report?.foizlar?.kunlik ?? 0 },
      { label: t('Haftalik foiz'), value: report?.foizlar?.haftalik ?? 0 },
      { label: t('Oylik foiz'), value: report?.foizlar?.oylik ?? 0 },
      { label: t('Choraklik foiz'), value: report?.foizlar?.choraklik ?? 0 },
      { label: t('Yillik foiz'), value: report?.foizlar?.yillik ?? 0 },
      { label: t('Tanlangan period'), value: report?.foizlar?.tanlanganPeriod ?? 0 },
    ],
    [report, t],
  );

  const historyColumns = [
    { key: 'sana', header: t('Sana'), render: (row) => row.sana },
    { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf || '-' },
    { key: 'fan', header: t('Fan'), render: (row) => row.fan || '-' },
    { key: 'oqituvchi', header: t("O'qituvchi"), render: (row) => row.oqituvchi || '-' },
    {
      key: 'holat',
      header: t('Holatlar'),
      render: (row) =>
        `${t('Keldi')}: ${row.holatlar?.KELDI || 0} / ${t('Kechikdi')}: ${row.holatlar?.KECHIKDI || 0} / ${t('Sababli')}: ${row.holatlar?.SABABLI || 0} / ${t('Sababsiz')}: ${row.holatlar?.SABABSIZ || 0}`,
    },
    { key: 'jami', header: t('Jami'), render: (row) => row.jami || 0 },
  ];

  function handleSubmit(event) {
    event.preventDefault();
    onFetch({
      sana,
      periodType,
      classroomId: classroomId === 'all' ? undefined : classroomId,
    });
  }

  function getFilterParams() {
    return {
      sana,
      periodType,
      classroomId: classroomId === 'all' ? undefined : classroomId,
    };
  }

  return (
      <div className="space-y-4">
      <Card title={t("Davomat bo'limi")}>
        <div className="flex flex-wrap gap-2">
          {activeView === 'report' ? (
            <Button type="button" variant="secondary" onClick={() => setActiveView('history')}>
              {t("O'tilgan darslar davomat tarixi")}
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setActiveView('report')}>
              {t('Ortga qaytish')}
            </Button>
          )}
        </div>
      </Card>

      <Card title={t('Davomat hisobotlari')}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
            {PERIOD_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(PERIOD_LABEL_KEYS[value] || value)}
              </option>
            ))}
          </Select>
          <Select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
            <option value="all">{t('Barcha sinflar')}</option>
            {classrooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.academicYear})
              </option>
            ))}
          </Select>
          <Button type="submit" variant="indigo" className="md:col-span-2">
            {t('Hisobotni yangilash')}
          </Button>
        </form>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={Boolean(exporting)}
            onClick={() => onExport?.('xlsx', getFilterParams())}
          >
            {exporting === 'xlsx' ? t('Excel yuklanmoqda...') : t('Excel export')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={Boolean(exporting)}
            onClick={() => onExport?.('pdf', getFilterParams())}
          >
            {exporting === 'pdf' ? t('PDF yuklanmoqda...') : t('PDF export')}
          </Button>
        </div>
        {report?.period && (
          <p className="mt-2 text-xs text-slate-500">
            {t('Tanlangan oraliq')}: {report.period.from} - {report.period.to}
          </p>
        )}
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && (
        <>
          {activeView === 'report' && (
            <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {percentCards.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm"
              >
                <p className="text-xs uppercase tracking-widest text-slate-300">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}%</p>
              </div>
            ))}
          </section>
            </>
          )}

          {activeView === 'history' && (
            <Card title={t('Barcha sinflar davomat tarixi')}>
            {report?.tarix?.length ? (
              <DataTable
                columns={historyColumns}
                rows={report.tarix}
                stickyHeader
                maxHeightClassName="max-h-[520px]"
              />
            ) : (
              <StateView type="empty" description={t("Tanlangan period bo'yicha tarix topilmadi")} />
            )}
            </Card>
          )}
        </>
      )}
      </div>
  );
}
