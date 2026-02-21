import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';
import { getLocalDateInputValue } from '../../lib/dateUtils';

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

  async function load(next = {}) {
    const nextPage = Number(next.page || page);
    const nextLimit = Number(next.limit || limit);
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest({
        path: '/api/student/davomat',
        query: {
          sana,
          periodType,
          ...(holat !== 'ALL' ? { holat } : {}),
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

  const columns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'vaqt', header: t('Vaqt'), render: (row) => row.vaqt },
      { key: 'oqituvchi', header: t("O'qituvchi"), render: (row) => row.oqituvchi },
      { key: 'holat', header: t('Holat'), render: (row) => holatLabel(t, row.holat) },
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

  return (
    <div className="space-y-4">
      <Card title={t('Mening davomatim')}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
            {PERIOD_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(PERIOD_LABEL_KEYS[value] || value)}
              </option>
            ))}
          </Select>
          <Select value={holat} onChange={(event) => setHolat(event.target.value)}>
            {HOLAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {holatLabel(t, value)}
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
        {data?.period && (
          <p className="mt-2 text-xs text-slate-500">
            {t('Oraliq')}: {data.period.from} - {data.period.to}
          </p>
        )}
        {holat !== 'ALL' && <p className="mt-1 text-xs text-slate-500">{t('Filtr')}: {holatLabel(t, holat)}</p>}
        <p className="mt-1 text-xs text-slate-500">
          {t('Sahifa')}: {data?.page || page} / {data?.pages || 1}
        </p>
      </Card>

      {loading && <StateView type="loading" />}
      {error && <StateView type="error" description={error} />}

      {!loading && !error && data && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-300">{t('Davomat foizi')}</p>
              <p className="mt-2 text-3xl font-bold">{data.statistika?.foiz || 0}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500">{t('Jami dars')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{data.statistika?.jami || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-slate-500">{t('Sinf')}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{data.student?.classroom || '-'}</p>
            </div>
          </section>

          <Card title={t('Holatlar kesimi')}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-3 text-sm">{t('Keldi')}: {data.statistika?.holatlar?.KELDI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">{t('Kechikdi')}: {data.statistika?.holatlar?.KECHIKDI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">{t('Sababli')}: {data.statistika?.holatlar?.SABABLI || 0}</div>
              <div className="rounded-lg border border-slate-200 p-3 text-sm">{t('Sababsiz')}: {data.statistika?.holatlar?.SABABSIZ || 0}</div>
            </div>
          </Card>

          <Card title={t('Davomat tarixi')}>
            {data.tarix?.length ? (
              <>
                <DataTable columns={columns} rows={data.tarix} stickyHeader maxHeightClassName="max-h-[520px]" />
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
