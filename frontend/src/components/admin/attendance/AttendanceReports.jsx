import { useMemo } from 'react';
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
const HOLAT_OPTIONS = ['ALL', 'KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ'];
const HOLAT_LABEL_KEYS = {
  ALL: 'Barcha holatlar',
  KELDI: 'Keldi',
  KECHIKDI: 'Kechikdi',
  SABABLI: 'Sababli',
  SABABSIZ: 'Sababsiz',
};

export default function AttendanceReports({
  classrooms,
  loading,
  error,
  report,
  query,
  onFetch,
  onExport,
  exporting,
}) {
  const { t } = useTranslation();
  const sana = query?.sana || todayStr();
  const classroomId = query?.classroomId || 'all';
  const periodType = query?.periodType || 'OYLIK';
  const holat = query?.holat || 'ALL';
  const page = Number(query?.page || 1);
  const limit = Number(query?.limit || 20);
  const activeView = query?.view === 'history' ? 'history' : 'report';
  const currentClassroom = useMemo(
    () => classrooms.find((item) => item.id === classroomId) || null,
    [classrooms, classroomId],
  );

  const percentCards = useMemo(
    () => [
      { label: t('Kunlik foiz'), value: report?.foizlar?.kunlik ?? 0 },
      { label: t('Haftalik foiz'), value: report?.foizlar?.haftalik ?? 0 },
      { label: t('Oylik foiz'), value: report?.foizlar?.oylik ?? 0 },
      { label: t('Choraklik foiz'), value: report?.foizlar?.choraklik ?? 0 },
      { label: t('Yillik foiz'), value: report?.foizlar?.yillik ?? 0 },
      { label: t('Tanlangan period (belgilangan)'), value: report?.foizlar?.tanlanganPeriod ?? 0 },
      { label: t('Tanlangan period (reja asosida)'), value: report?.foizlar?.tanlanganPeriodByExpected ?? 0 },
      { label: t('Coverage'), value: report?.foizlar?.coverage ?? 0 },
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
      holat,
      classroomId,
      page: 1,
      view: activeView,
    });
  }

  function getFilterParams() {
    return {
      sana,
      periodType,
      ...(classroomId === 'all' ? {} : { classroomId }),
      ...(holat === 'ALL' ? {} : { holat }),
    };
  }

  const reportPage = Number(report?.page || page || 1);
  const reportPages = Number(report?.pages || 1);
  const reportTotal = Number(report?.total || 0);
  const historyTitle = currentClassroom
    ? `${currentClassroom.name} (${currentClassroom.academicYear}) - ${t('davomat tarixi')}`
    : t('Barcha sinflar davomat tarixi');
  const risk = report?.risk || {};

  return (
    <div className="space-y-4">
      <Card title={t("Davomat bo'limi")}>
        <div className="flex flex-wrap gap-2">
          {activeView === 'report' ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onFetch({ view: 'history', page: 1 })}
            >
              {t("O'tilgan darslar davomat tarixi")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onFetch({ view: 'report' })}
            >
              {t('Ortga qaytish')}
            </Button>
          )}
        </div>
      </Card>

      <Card title={t('Davomat hisobotlari')}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <Input
            type="date"
            value={sana}
            onChange={(event) => onFetch({ sana: event.target.value })}
          />
          <Select
            value={periodType}
            onChange={(event) => onFetch({ periodType: event.target.value, page: 1 })}
          >
            {PERIOD_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(PERIOD_LABEL_KEYS[value] || value)}
              </option>
            ))}
          </Select>
          <Select
            value={classroomId}
            onChange={(event) => onFetch({ classroomId: event.target.value, page: 1 })}
          >
            <option value="all">{t('Barcha sinflar')}</option>
            {classrooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.academicYear})
              </option>
            ))}
          </Select>
          <Select
            value={holat}
            onChange={(event) => onFetch({ holat: event.target.value, page: 1 })}
          >
            {HOLAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(HOLAT_LABEL_KEYS[value] || value)}
              </option>
            ))}
          </Select>
          <Select
            value={String(limit)}
            onChange={(event) => onFetch({ limit: Number(event.target.value), page: 1 })}
          >
            {[20, 50, 100, 200].map((size) => (
              <option key={size} value={size}>
                {t('{{count}} ta / sahifa', { count: size })}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="indigo">
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
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {percentCards.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/60"
                  >
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                      {item.value}%
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(0, Math.min(100, Number(item.value) || 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Card title={t('Hisobot qamrovi')}>
                  <p className="mb-2 text-xs text-slate-500">
                    {t("Quyidagi raqamlar tanlangan davr bo'yicha umumiy holatni ko'rsatadi.")}
                  </p>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>
                      {t('Belgilangan yozuvlar')}: <b>{report?.jami?.tanlanganPeriodDavomatYozuvlari || 0}</b>
                      <span className="ml-1 text-xs text-slate-500">({t("kiritilgan davomatlar soni")})</span>
                    </p>
                    <p>
                      {t('Rejadagi yozuvlar')}: <b>{report?.jami?.tanlanganPeriodRejadagiYozuvlar || 0}</b>
                      <span className="ml-1 text-xs text-slate-500">({t("jadval bo'yicha bo'lishi kerak bo'lgan yozuvlar")})</span>
                    </p>
                    <p>
                      {t('Belgilanmagan yozuvlar')}: <b>{report?.jami?.belgilanmaganYozuvlar || 0}</b>
                      <span className="ml-1 text-xs text-slate-500">({t("hali kiritilmagan davomatlar")})</span>
                    </p>
                    <p>
                      {t('Dars sessiyalari')}: <b>{report?.jami?.tanlanganPeriodDarsSessiyalari || 0}</b>
                      <span className="ml-1 text-xs text-slate-500">({t("dars o'tilgan yoki rejalangan slotlar soni")})</span>
                    </p>
                  </div>
                </Card>

                <Card title={t("Top sababsiz o'quvchilar")}>
                  <p className="mb-2 text-xs text-slate-500">
                    {t("Raqam o'quvchi nechta darsni sababsiz qoldirganini bildiradi.")}
                  </p>
                  {(risk?.topSababsizStudents || []).length ? (
                    <div className="space-y-2 text-sm">
                      {risk.topSababsizStudents.map((row) => (
                        <div key={row.studentId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{row.fullName}</p>
                            <p className="truncate text-xs text-slate-500">@{row.username || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-rose-700">{row.count}</p>
                            <p className="text-[11px] text-slate-500">{t('ta dars')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <StateView type="empty" description={t("Sababsiz yo'q")} />
                  )}
                </Card>

                <Card title={t('Top sababsiz sinflar')}>
                  <p className="mb-2 text-xs text-slate-500">
                    {t("Raqam sinf o'quvchilari bo'yicha jami sababsiz qoldirilgan darslar soni.")}
                  </p>
                  <div className="space-y-2 text-sm">
                    {(risk?.topSababsizClassrooms || []).slice(0, 3).map((row) => (
                      <div key={row.classroomId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="truncate font-medium text-slate-800">{row.classroom}</p>
                        <div className="text-right">
                          <p className="font-semibold text-rose-700">{row.count}</p>
                          <p className="text-[11px] text-slate-500">{t('ta dars')}</p>
                        </div>
                      </div>
                    ))}
                    {!(risk?.topSababsizClassrooms || []).length && (
                      <StateView type="empty" description={t("Sababsiz yo'q")} />
                    )}
                  </div>
                </Card>
              </section>
            </>
          )}

          {activeView === 'history' && (
            <Card title={historyTitle}>
              {report?.tarix?.length ? (
                <>
                  <DataTable
                    columns={historyColumns}
                    rows={report.tarix}
                    stickyHeader
                    stickyFirstColumn
                    maxHeightClassName="max-h-[520px]"
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="secondary"
                      onClick={() => onFetch({ page: Math.max(1, reportPage - 1), view: 'history' })}
                      disabled={reportPage <= 1}
                    >
                      {t('Oldingi')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onFetch({ page: Math.min(reportPages, reportPage + 1), view: 'history' })}
                      disabled={reportPage >= reportPages}
                    >
                      {t('Keyingi')}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {t('Sahifa')}: {reportPage}/{reportPages} | {t('Jami sessiya')}: {reportTotal}
                  </p>
                </>
              ) : (
                <StateView
                  type="empty"
                  description={t("Tanlangan period bo'yicha tarix topilmadi")}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
