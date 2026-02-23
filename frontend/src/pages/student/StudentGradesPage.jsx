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
import {
  useLazyGetStudentClassGradesQuery,
  useLazyGetStudentGradesQuery,
} from '../../services/api/studentApi';

const BAHO_TURI_OPTIONS = ['ALL', 'JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
const BAHO_TURI_LABEL_KEYS = {
  ALL: 'Hammasi',
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

export default function StudentGradesPage() {
  const { t } = useTranslation();
  const [sana, setSana] = useState(getLocalDateInputValue());
  const [bahoTuri, setBahoTuri] = useState('ALL');
  const [activeView, setActiveView] = useState('mine');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [fetchMyGrades] = useLazyGetStudentGradesQuery();
  const [fetchClassGrades] = useLazyGetStudentClassGradesQuery();

  async function load(next = {}) {
    const nextPage = Number(next.page || page);
    const nextLimit = Number(next.limit || limit);
    setLoading(true);
    setError('');
    try {
      const fetcher = activeView === 'mine' ? fetchMyGrades : fetchClassGrades;
      const res = await fetcher({
        sana,
        ...(bahoTuri !== 'ALL' ? { bahoTuri } : {}),
        page: nextPage,
        limit: nextLimit,
      }).unwrap();
      setData(res);
      setPage(res.page || nextPage);
      setLimit(res.limit || nextLimit);
    } catch (err) {
      setError(err?.message || t("Baholar olinmadi"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const myColumns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      { key: 'oqituvchi', header: t("O'qituvchi"), render: (row) => row.oqituvchi },
      {
        key: 'turi',
        header: t('Turi'),
        render: (row) => <StatusBadge domain="gradeType" value={row.turi} className="shadow-none" />,
      },
      { key: 'ball', header: t('Ball'), render: (row) => `${row.ball}/${row.maxBall}` },
      { key: 'izoh', header: t('Izoh'), render: (row) => row.izoh || '-' },
    ],
    [t],
  );

  const classColumns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      { key: 'oqituvchi', header: t("O'qituvchi"), render: (row) => row.oqituvchi },
      {
        key: 'turi',
        header: t('Turi'),
        render: (row) => <StatusBadge domain="gradeType" value={row.turi} className="shadow-none" />,
      },
      { key: 'yozuvlarSoni', header: t('Yozuvlar'), render: (row) => row.yozuvlarSoni },
      { key: 'ortacha', header: t("O'rtacha"), render: (row) => `${row.ortachaBall}/${row.ortachaMaxBall}` },
      { key: 'ortachaFoiz', header: t("O'rtacha %"), render: (row) => `${row.ortachaFoiz}%` },
      { key: 'diapazon', header: t('Min/Max'), render: (row) => `${row.minBall} / ${row.maxBall}` },
    ],
    [t],
  );
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

  return (
    <div className="space-y-4">
      <Card title={t('Mening baholarim')} subtitle={t("Baholarni filtrlang va o'zingiz/sinf kesimida ko'ring.")}>
        <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <Button
            variant={activeView === 'mine' ? 'indigo' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('mine')}
          >
            {t('Mening baholarim')}
          </Button>
          <Button
            variant={activeView === 'class' ? 'indigo' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('class')}
          >
            {t('Sinf baholari')}
          </Button>
        </div>
        <FilterToolbar
          className="mb-0 mt-0"
          gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
          onReset={() => {
            setBahoTuri('ALL');
            setLimit(20);
            load({ page: 1, limit: 20 });
          }}
          resetLabel={t('Filterlarni tozalash')}
          resetDisabled={bahoTuri === 'ALL' && Number(limit) === 20}
          actions={(
            <Button variant="indigo" size="sm" onClick={() => load({ page: 1, limit })}>
              {t('Yangilash')}
            </Button>
          )}
        >
          <FilterToolbarItem label={t('Sana')}>
            <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Baho turi')}>
            <Select value={bahoTuri} onChange={(event) => setBahoTuri(event.target.value)}>
              {BAHO_TURI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(BAHO_TURI_LABEL_KEYS[opt] || opt)}
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
          <FilterToolbarItem label={t('Sinf')}>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              {activeView === 'class' ? data?.classroom || t('Mening sinfim') : t("Faqat 'Sinf baholari' ko'rinishida")}
            </div>
          </FilterToolbarItem>
          <FilterToolbarItem label={t("Ko'rinish")}>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              {activeView === 'mine' ? t('Mening baholarim') : t('Sinf baholari')}
            </div>
          </FilterToolbarItem>
        </FilterToolbar>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Sahifa')}: {data?.page || page} / {data?.pages || 1}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Jami')}: {data?.total || 0}
          </span>
          {activeView === 'class' && data?.isAnonymized && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Anonim ko\'rinish')}
            </span>
          )}
        </div>
        {activeView === 'class' && data?.isAnonymized && (
          <p className="mt-2 text-xs text-slate-500">
            {t("Sinf baholari anonim ko'rinishda (individual o'quvchi ma'lumoti yashirilgan).")}
          </p>
        )}
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'].map((key) => (
              <div key={key} className={statCardClass}>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t(BAHO_TURI_LABEL_KEYS[key] || key)}
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {data.stats?.[key]?.count || 0} {t('ta')} / {data.stats?.[key]?.avg || 0}%
                </p>
              </div>
            ))}
          </section>
          <Card title={t('Jami baholar: {{count}}', { count: data.total || 0 })}>
            <DataTable
              columns={activeView === 'class' ? classColumns : myColumns}
              rows={data.baholar || []}
              stickyHeader
              stickyFirstColumn
              density="compact"
              maxHeightClassName="max-h-[560px]"
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
          </Card>
        </>
      )}
    </div>
  );
}
