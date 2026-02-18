import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';

const PERIOD_OPTIONS = [
  { value: 'KUNLIK', label: 'Kunlik' },
  { value: 'HAFTALIK', label: 'Haftalik' },
  { value: 'OYLIK', label: 'Oylik' },
  { value: 'CHORAKLIK', label: 'Choraklik' },
  { value: 'YILLIK', label: 'Yillik' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentAttendancePage() {
  const [sana, setSana] = useState(todayStr());
  const [periodType, setPeriodType] = useState('OYLIK');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest({
        path: '/api/student/davomat',
        query: { sana, periodType },
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

  const columns = useMemo(
    () => [
      { key: 'sana', header: 'Sana', render: (row) => row.sana },
      { key: 'fan', header: 'Fan', render: (row) => row.fan },
      { key: 'sinf', header: 'Sinf', render: (row) => row.sinf },
      { key: 'vaqt', header: 'Vaqt', render: (row) => row.vaqt },
      { key: 'oqituvchi', header: "O'qituvchi", render: (row) => row.oqituvchi },
      { key: 'holat', header: 'Holat', render: (row) => row.holat },
      {
        key: 'baho',
        header: 'Baho',
        render: (row) => (row.bahoBall !== null && row.bahoMaxBall ? `${row.bahoBall}/${row.bahoMaxBall}` : '-'),
      },
      { key: 'bahoTuri', header: 'Baho turi', render: (row) => row.bahoTuri || '-' },
      { key: 'izoh', header: 'Izoh', render: (row) => row.izoh || '-' },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <Card title="Mening davomatim">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button variant="indigo" onClick={load}>
            Yangilash
          </Button>
        </div>
        {data?.period && (
          <p className="mt-2 text-xs text-slate-500">
            Oraliq: {data.period.from} - {data.period.to}
          </p>
        )}
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-300">Davomat foizi</p>
              <p className="mt-2 text-3xl font-bold">{data.statistika?.foiz || 0}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500">Jami dars</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.statistika?.jami || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500">Sinf</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{data.student?.classroom || '-'}</p>
            </div>
          </section>

          <Card title="Holatlar kesimi">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3 text-sm">Keldi: {data.statistika?.holatlar?.KELDI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">Kechikdi: {data.statistika?.holatlar?.KECHIKDI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">Sababli: {data.statistika?.holatlar?.SABABLI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">Sababsiz: {data.statistika?.holatlar?.SABABSIZ || 0}</div>
            </div>
          </Card>

          <Card title="Davomat tarixi">
            {data.tarix?.length ? (
              <DataTable columns={columns} rows={data.tarix} stickyHeader maxHeightClassName="max-h-[520px]" />
            ) : (
              <StateView type="empty" description="Tanlangan period bo'yicha davomat topilmadi" />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
