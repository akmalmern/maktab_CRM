import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';
import { getLocalDateInputValue } from '../../lib/dateUtils';

const BAHO_TURI_OPTIONS = ['ALL', 'JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
const BAHO_TURI_LABEL_KEYS = {
  ALL: 'Hammasi',
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

export default function TeacherGradesPage() {
  const { t } = useTranslation();
  const [sana, setSana] = useState(getLocalDateInputValue());
  const [bahoTuri, setBahoTuri] = useState('ALL');
  const [classroomId, setClassroomId] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load(opts = {}) {
    const nextPage = Number(opts.page || page);
    const nextLimit = Number(opts.limit || limit);
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest({
        path: '/api/teacher/baholar',
        query: {
          sana,
          ...(bahoTuri !== 'ALL' ? { bahoTuri } : {}),
          ...(classroomId !== 'ALL' ? { classroomId } : {}),
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

  async function loadClassrooms() {
    try {
      const res = await apiRequest({ path: '/api/teacher/jadval' });
      const map = new Map();
      for (const dars of res.darslar || []) {
        if (dars?.sinf?.id && !map.has(dars.sinf.id)) {
          map.set(dars.sinf.id, dars.sinf);
        }
      }
      setClassrooms([...map.values()]);
    } catch {
      setClassrooms([]);
    }
  }

  useEffect(() => {
    loadClassrooms();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'student', header: t("O'quvchi"), render: (row) => row.student },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      { key: 'turi', header: t('Turi'), render: (row) => t(BAHO_TURI_LABEL_KEYS[row.turi] || row.turi, { defaultValue: row.turi }) },
      { key: 'ball', header: t('Ball'), render: (row) => `${row.ball}/${row.maxBall}` },
      { key: 'izoh', header: t('Izoh'), render: (row) => row.izoh || '-' },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <Card title={t('Baholar')}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
            <option value="ALL">{t('Barcha sinflar')}</option>
            {classrooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.academicYear})
              </option>
            ))}
          </Select>
          <Select value={bahoTuri} onChange={(event) => setBahoTuri(event.target.value)}>
            {BAHO_TURI_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(BAHO_TURI_LABEL_KEYS[opt] || opt)}
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
          <Button variant="indigo" onClick={() => load({ page: 1, limit })}>
            {t('Yangilash')}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {t('Sahifa')}: {data?.page || page} / {data?.pages || 1}
        </p>
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'].map((key) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="text-slate-500">{t(BAHO_TURI_LABEL_KEYS[key] || key)}</p>
                <p className="font-semibold text-slate-900">
                  {data.stats?.[key]?.count || 0} {t('ta')} / {data.stats?.[key]?.avg || 0}%
                </p>
              </div>
            ))}
          </section>
          <Card title={t('Jami baholar: {{count}}', { count: data.total || 0 })}>
            <DataTable columns={columns} rows={data.baholar || []} stickyHeader maxHeightClassName="max-h-[560px]" />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => load({ page: Math.max(1, (data?.page || page) - 1), limit })}
                disabled={(data?.page || page) <= 1}
              >
                {t('Oldingi')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => load({ page: Math.min(data?.pages || 1, (data?.page || page) + 1), limit })}
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
