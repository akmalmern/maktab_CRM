import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  DataTable,
  FilterToolbar,
  FilterToolbarItem,
  Input,
  Select,
  StateView,
  StatusBadge,
} from '../../components/ui';
import { getLocalDateInputValue } from '../../lib/dateUtils';
import { useLazyGetStudentAttendanceQuery } from '../../services/api/studentApi';

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

function holatLabel(t, value) {
  return t(HOLAT_LABEL_KEYS[value] || value, { defaultValue: value });
}

function bahoTuriLabel(t, value) {
  if (!value) return '-';
  const map = {
    JORIY: 'Joriy',
    NAZORAT: 'Nazorat',
    ORALIQ: 'Oraliq',
    YAKUNIY: 'Yakuniy',
  };
  return t(map[value] || value, { defaultValue: value });
}

export default function StudentAttendancePage() {
  const { t } = useTranslation();
  const [sana, setSana] = useState(getLocalDateInputValue());
  const [periodType, setPeriodType] = useState('OYLIK');
  const [holat, setHolat] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [fetchStudentAttendance] = useLazyGetStudentAttendanceQuery();

  async function load(next = {}) {
    const nextPage = Number(next.page || page);
    const nextLimit = Number(next.limit || limit);
    setLoading(true);
    setError('');
    try {
      const res = await fetchStudentAttendance({
        sana,
        periodType,
        ...(holat !== 'ALL' ? { holat } : {}),
        page: nextPage,
        limit: nextLimit,
      }).unwrap();
      setData(res);
      setPage(res.page || nextPage);
      setLimit(res.limit || nextLimit);
    } catch (err) {
      setError(err?.message || t("Davomat olinmadi"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      { key: 'oqituvchi', header: t("O'qituvchi"), render: (row) => row.oqituvchi },
      { key: 'holat', header: t('Holat'), render: (row) => <StatusBadge domain="attendance" value={row.holat} className="shadow-none" /> },
      {
        key: 'baho',
        header: t('Baho'),
        render: (row) => (row.bahoBall !== null && row.bahoMaxBall ? `${row.bahoBall}/${row.bahoMaxBall}` : '-'),
      },
      { key: 'bahoTuri', header: t('Baho turi'), render: (row) => bahoTuriLabel(t, row.bahoTuri) },
      { key: 'izoh', header: t('Izoh'), render: (row) => row.izoh || '-' },
    ],
    [t],
  );
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

  return (
    <div className="space-y-4">
      <Card title={t('Mening davomatim')} subtitle={t("Davomat tarixini period va holat bo'yicha ko'ring.")}>
        <FilterToolbar
          className="mb-0 mt-0"
          gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
          onReset={() => {
            setPeriodType('OYLIK');
            setHolat('ALL');
            setLimit(20);
            load({ page: 1, limit: 20 });
          }}
          resetLabel={t('Filterlarni tozalash')}
          resetDisabled={periodType === 'OYLIK' && holat === 'ALL' && Number(limit) === 20}
          actions={(
            <Button variant="indigo" size="sm" onClick={() => load({ page: 1, limit })}>
              {t('Yangilash')}
            </Button>
          )}
          footer={(
            <>
          {data?.period && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Oraliq')}: {data.period.from} - {data.period.to}
            </span>
          )}
          {holat !== 'ALL' && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Filtr')}: {holatLabel(t, holat)}
            </span>
          )}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Sahifa')}: {data?.page || page} / {data?.pages || 1}
          </span>
            </>
          )}
        >
          <FilterToolbarItem label={t('Sana')}>
            <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Period')}>
            <Select value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
              {PERIOD_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {t(PERIOD_LABEL_KEYS[value] || value)}
                </option>
              ))}
            </Select>
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Holat filtri')}>
            <Select value={holat} onChange={(event) => setHolat(event.target.value)}>
              {HOLAT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {holatLabel(t, value)}
                </option>
              ))}
            </Select>
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Sahifa limiti')}>
            <Select
              value={String(limit)}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                load({ page: 1, limit: nextLimit });
              }}
            >
              {[20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {t('{{count}} ta / sahifa', { count: size })}
                </option>
              ))}
            </Select>
          </FilterToolbarItem>
          <FilterToolbarItem label={t("Ko'rinish")}>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              {t('Davomat tarixi')}
            </div>
          </FilterToolbarItem>
        </FilterToolbar>
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Davomat foizi')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{data.statistika?.foiz || 0}%</p>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-600"
                  style={{ width: `${Math.min(100, Math.max(0, Number(data.statistika?.foiz || 0)))}%` }}
                />
              </div>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Jami dars')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{data.statistika?.jami || 0}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Sinf')}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{data.student?.classroom || '-'}</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('Jami yozuvlar')}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{data.total || 0}</p>
            </div>
          </section>

          <Card title={t('Holatlar kesimi')}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Keldi', data.statistika?.holatlar?.KELDI || 0, 'bg-emerald-50 border-emerald-200 text-emerald-800'],
                ['Kechikdi', data.statistika?.holatlar?.KECHIKDI || 0, 'bg-amber-50 border-amber-200 text-amber-800'],
                ['Sababli', data.statistika?.holatlar?.SABABLI || 0, 'bg-sky-50 border-sky-200 text-sky-800'],
                ['Sababsiz', data.statistika?.holatlar?.SABABSIZ || 0, 'bg-rose-50 border-rose-200 text-rose-800'],
              ].map(([label, count, cls]) => (
                <div key={label} className={`rounded-xl border px-3 py-3 text-sm shadow-sm ${cls}`}>
                  <p className="text-xs font-medium uppercase tracking-wide opacity-80">{t(label)}</p>
                  <p className="mt-1 text-lg font-semibold">{count}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t('Davomat tarixi')}>
            {data.tarix?.length ? (
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
                    onClick={() => load({ page: Math.max(1, (data?.page || page) - 1) })}
                    disabled={(data?.page || page) <= 1}
                  >
                    {t('Oldingi')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => load({ page: Math.min(data?.pages || 1, (data?.page || page) + 1) })}
                    disabled={(data?.page || page) >= (data?.pages || 1)}
                  >
                    {t('Keyingi')}
                  </Button>
                </div>
              </>
            ) : (
              <StateView type="empty" description={t("Tanlangan period bo'yicha davomat topilmadi")} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
