import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const BAHO_TURI_OPTIONS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'JORIY', label: 'Joriy' },
  { value: 'NAZORAT', label: 'Nazorat' },
  { value: 'ORALIQ', label: 'Oraliq' },
  { value: 'YAKUNIY', label: 'Yakuniy' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentGradesPage() {
  const [sana, setSana] = useState(todayStr());
  const [bahoTuri, setBahoTuri] = useState('ALL');
  const [activeView, setActiveView] = useState('mine');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest({
        path: activeView === 'mine' ? '/api/student/baholar' : '/api/student/sinf-baholar',
        query: {
          sana,
          ...(bahoTuri !== 'ALL' ? { bahoTuri } : {}),
          page: 1,
          limit: 100,
        },
      });
      setData(res);
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView]);

  const columns = useMemo(
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

  return (
    <div className="space-y-4">
      <Card title="Mening baholarim">
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            variant={activeView === 'mine' ? 'indigo' : 'secondary'}
            onClick={() => setActiveView('mine')}
          >
            Mening baholarim
          </Button>
          <Button
            variant={activeView === 'class' ? 'indigo' : 'secondary'}
            onClick={() => setActiveView('class')}
          >
            Sinf baholari
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={bahoTuri} onChange={(event) => setBahoTuri(event.target.value)}>
            {BAHO_TURI_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          {activeView === 'class' ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {data?.classroom || 'Mening sinfim'}
            </div>
          ) : (
            <div />
          )}
          <Button variant="indigo" onClick={load}>
            Yangilash
          </Button>
        </div>
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
                  {data.stats?.[key]?.count || 0} ta / {data.stats?.[key]?.avg || 0}%
                </p>
              </div>
            ))}
          </section>
          <Card title={`Jami baholar: ${data.total || 0}`}>
            <DataTable
              columns={
                activeView === 'class'
                  ? [{ key: 'student', header: "O'quvchi", render: (row) => row.student }, ...columns]
                  : columns
              }
              rows={data.baholar || []}
              stickyHeader
              maxHeightClassName="max-h-[560px]"
            />
          </Card>
        </>
      )}
    </div>
  );
}
