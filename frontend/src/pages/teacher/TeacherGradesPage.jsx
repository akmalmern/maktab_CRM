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
import { useLazyGetTeacherGradesQuery, useLazyGetTeacherScheduleQuery } from '../../services/api/teacherApi';

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
  const [fetchTeacherGrades] = useLazyGetTeacherGradesQuery();
  const [fetchTeacherSchedule] = useLazyGetTeacherScheduleQuery();

  async function load(opts = {}) {
    const nextPage = Number(opts.page || page);
    const nextLimit = Number(opts.limit || limit);
    setLoading(true);
    setError('');
    try {
      const res = await fetchTeacherGrades({
        sana,
        ...(bahoTuri !== 'ALL' ? { bahoTuri } : {}),
        ...(classroomId !== 'ALL' ? { classroomId } : {}),
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

  async function loadClassrooms() {
    try {
      const res = await fetchTeacherSchedule({}).unwrap();
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
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

  return (
    <div className="space-y-4">
      <Card title={t('Baholar')} subtitle={t("Baholarni sana, sinf va tur bo'yicha filtrlang.")}>
        <FilterToolbar
          className="mb-0 mt-0"
          gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
          onReset={() => {
            setClassroomId('ALL');
            setBahoTuri('ALL');
            setLimit(20);
            load({ page: 1, limit: 20 });
          }}
          resetLabel={t('Filterlarni tozalash')}
          resetDisabled={classroomId === 'ALL' && bahoTuri === 'ALL' && Number(limit) === 20}
          actions={(
            <Button variant="indigo" size="sm" onClick={() => load({ page: 1, limit })}>
              {t('Yangilash')}
            </Button>
          )}
        >
          <FilterToolbarItem label={t('Sana')}>
            <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Sinf')}>
            <Select value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
              <option value="ALL">{t('Barcha sinflar')}</option>
              {classrooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.academicYear})
                </option>
              ))}
            </Select>
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
          <FilterToolbarItem label={t('Joriy sinflar')}>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              {classrooms.length}
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
        </div>
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
              columns={columns}
              rows={data.baholar || []}
              stickyHeader
              stickyFirstColumn
              density="compact"
              maxHeightClassName="max-h-[560px]"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
