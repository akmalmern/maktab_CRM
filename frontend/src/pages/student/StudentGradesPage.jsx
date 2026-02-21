import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';
import { getLocalDateInputValue } from '../../lib/dateUtils';

const BAHO_TURI_OPTIONS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'JORIY', label: 'Joriy' },
  { value: 'NAZORAT', label: 'Nazorat' },
  { value: 'ORALIQ', label: 'Oraliq' },
  { value: 'YAKUNIY', label: 'Yakuniy' },
];

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

  async function load(next = {}) {
    const nextPage = Number(next.page || page);
    const nextLimit = Number(next.limit || limit);
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest({
        path: activeView === 'mine' ? '/api/student/baholar' : '/api/student/sinf-baholar',
        query: {
          sana,
          ...(bahoTuri !== 'ALL' ? { bahoTuri } : {}),
          page: nextPage,
          limit: nextLimit,
        },
      });
      setData(res);
      setPage(res.page || nextPage);
      setLimit(res.limit || nextLimit);
    } catch (err) {
      setError(getErrorMessage(err));
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
      { key: 'sana', header: 'Sana', render: (row) => row.sana },
      { key: 'fan', header: 'Fan', render: (row) => row.fan },
      { key: 'sinf', header: 'Sinf', render: (row) => row.sinf },
      { key: 'vaqt', header: 'Vaqt', render: (row) => row.vaqt },
      { key: 'oqituvchi', header: "O'qituvchi", render: (row) => row.oqituvchi },
      { key: 'turi', header: 'Turi', render: (row) => row.turi },
      { key: 'ball', header: 'Ball', render: (row) => `${row.ball}/${row.maxBall}` },
      { key: 'izoh', header: 'Izoh', render: (row) => row.izoh || '-' },
    ],
    [],
  );

  const classColumns = useMemo(
    () => [
      { key: 'sana', header: 'Sana', render: (row) => row.sana },
      { key: 'fan', header: 'Fan', render: (row) => row.fan },
      { key: 'vaqt', header: 'Vaqt', render: (row) => row.vaqt },
      { key: 'oqituvchi', header: "O'qituvchi", render: (row) => row.oqituvchi },
      { key: 'turi', header: 'Turi', render: (row) => row.turi },
      { key: 'yozuvlarSoni', header: 'Yozuvlar', render: (row) => row.yozuvlarSoni },
      { key: 'ortacha', header: "O'rtacha", render: (row) => `${row.ortachaBall}/${row.ortachaMaxBall}` },
      { key: 'ortachaFoiz', header: "O'rtacha %", render: (row) => `${row.ortachaFoiz}%` },
      { key: 'diapazon', header: 'Min/Max', render: (row) => `${row.minBall} / ${row.maxBall}` },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card title={t('Mening baholarim')}>
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            variant={activeView === 'mine' ? 'indigo' : 'secondary'}
            onClick={() => setActiveView('mine')}
          >
            {t('Mening baholarim')}
          </Button>
          <Button
            variant={activeView === 'class' ? 'indigo' : 'secondary'}
            onClick={() => setActiveView('class')}
          >
            {t('Sinf baholari')}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={bahoTuri} onChange={(event) => setBahoTuri(event.target.value)}>
            {BAHO_TURI_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
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
          {activeView === 'class' ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {data?.classroom || t('Mening sinfim')}
            </div>
          ) : (
            <div />
          )}
          <Button variant="indigo" onClick={() => load({ page: 1, limit })}>
            {t('Yangilash')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t('Sahifa')}: {data?.page || page} / {data?.pages || 1}
        </p>
        {activeView === 'class' && data?.isAnonymized && (
          <p className="mt-1 text-xs text-slate-500">
            {t("Sinf baholari anonim ko'rinishda (individual o'quvchi ma'lumoti yashirilgan).")}
          </p>
        )}
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'].map((key) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="text-slate-500">{key}</p>
                <p className="font-semibold text-slate-900">
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
              maxHeightClassName="max-h-[560px]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
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
