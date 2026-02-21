import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { apiRequest, getErrorMessage } from '../../lib/apiClient';
import { getLocalDateInputValue } from '../../lib/dateUtils';

const HOLAT_OPTIONS = [
  { value: 'KELDI', label: 'Keldi' },
  { value: 'KECHIKDI', label: 'Kechikdi' },
  { value: 'SABABLI', label: 'Sababli' },
  { value: 'SABABSIZ', label: 'Sababsiz' },
];

const BAHO_TURI_OPTIONS = [
  { value: 'JORIY', label: 'Joriy' },
  { value: 'NAZORAT', label: 'Nazorat' },
  { value: 'ORALIQ', label: 'Oraliq' },
  { value: 'YAKUNIY', label: 'Yakuniy' },
];

const PERIOD_OPTIONS = [
  { value: 'KUNLIK', label: 'Kunlik' },
  { value: 'HAFTALIK', label: 'Haftalik' },
  { value: 'OYLIK', label: 'Oylik' },
  { value: 'CHORAKLIK', label: 'Choraklik' },
  { value: 'YILLIK', label: 'Yillik' },
];

export default function TeacherAttendancePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const querySana = searchParams.get('sana');
  const queryDarsId = searchParams.get('darsId');

  const [sana, setSana] = useState(getLocalDateInputValue());
  const [oquvYili, setOquvYili] = useState('');
  const [oquvYillar, setOquvYillar] = useState([]);
  const [darslar, setDarslar] = useState([]);
  const [selectedDarsId, setSelectedDarsId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tarixPeriodType, setTarixPeriodType] = useState('OYLIK');
  const [tarixPage, setTarixPage] = useState(1);
  const [tarixLimit, setTarixLimit] = useState(20);
  const [tarixPages, setTarixPages] = useState(1);
  const [tarixLoading, setTarixLoading] = useState(false);
  const [tarix, setTarix] = useState([]);
  const [tarixRange, setTarixRange] = useState(null);
  const [activeView, setActiveView] = useState('journal');

  const loadDarslar = useCallback(async (nextSana, nextOquvYili = '') => {
    setLoading(true);
    try {
      const data = await apiRequest({
        path: '/api/teacher/davomat/darslar',
        query: {
          sana: nextSana,
          ...(nextOquvYili ? { oquvYili: nextOquvYili } : {}),
        },
      });
      setOquvYillar(data.oquvYillar || []);
      setOquvYili(data.oquvYili || nextOquvYili || '');
      setDarslar(data.darslar || []);
      setSelectedDarsId((prev) => {
        if (queryDarsId && (data.darslar || []).some((item) => item.id === queryDarsId)) {
          return queryDarsId;
        }
        if (prev && (data.darslar || []).some((item) => item.id === prev)) return prev;
        return data.darslar?.[0]?.id || '';
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDarslar([]);
      setSelectedDarsId('');
      setOquvYillar([]);
    } finally {
      setLoading(false);
    }
  }, [queryDarsId]);

  const loadDetail = useCallback(async (darsId, nextSana) => {
    if (!darsId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest({
        path: `/api/teacher/davomat/dars/${darsId}`,
        query: { sana: nextSana },
      });
      setDetail({
        ...data,
        students: (data.students || []).map((student) => ({
          ...student,
          holat: student.holat || 'KELDI',
          izoh: student.izoh || '',
          bahoBall: student.bahoBall ?? '',
          bahoMaxBall: student.bahoMaxBall ?? 5,
          bahoTuri: student.bahoTuri || 'JORIY',
          bahoIzoh: student.bahoIzoh || '',
        })),
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTarix = useCallback(async (nextSana, nextPeriodType, opts = {}) => {
    const nextPage = Number(opts.page || 1);
    const nextLimit = Number(opts.limit || 20);
    setTarixLoading(true);
    try {
      const data = await apiRequest({
        path: '/api/teacher/davomat/tarix',
        query: {
          sana: nextSana,
          periodType: nextPeriodType,
          page: nextPage,
          limit: nextLimit,
        },
      });
      setTarix(data.tarix || []);
      setTarixRange(data.period || null);
      setTarixPage(data.page || nextPage);
      setTarixLimit(data.limit || nextLimit);
      setTarixPages(data.pages || 1);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setTarix([]);
      setTarixRange(null);
      setTarixPage(1);
      setTarixPages(1);
    } finally {
      setTarixLoading(false);
    }
  }, []);

  useEffect(() => {
    if (querySana) setSana(querySana);
  }, [querySana]);

  useEffect(() => {
    if (activeView !== 'journal') return;
    loadDarslar(sana, oquvYili);
  }, [activeView, loadDarslar, sana, oquvYili]);

  useEffect(() => {
    if (activeView !== 'journal') return;
    loadDetail(selectedDarsId, sana);
  }, [activeView, loadDetail, selectedDarsId, sana]);

  useEffect(() => {
    if (activeView !== 'history') return;
    loadTarix(sana, tarixPeriodType, { page: 1, limit: tarixLimit });
  }, [activeView, loadTarix, sana, tarixLimit, tarixPeriodType]);

  const columns = useMemo(
    () => [
      { key: 'fullName', header: "O'quvchi", render: (row) => row.fullName },
      { key: 'username', header: 'Username', render: (row) => row.username || '-' },
      {
        key: 'holat',
        header: 'Holat',
        render: (row) => (
          <Select
            value={row.holat}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, holat: event.target.value } : item,
                ),
              }))
            }
          >
            {HOLAT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'izoh',
        header: 'Izoh',
        render: (row) => (
          <Input
            type="text"
            value={row.izoh || ''}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, izoh: event.target.value } : item,
                ),
              }))
            }
            placeholder="Ixtiyoriy"
          />
        ),
      },
      {
        key: 'bahoTuri',
        header: 'Baho turi',
        render: (row) => (
          <Select
            value={row.bahoTuri || 'JORIY'}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, bahoTuri: event.target.value } : item,
                ),
              }))
            }
          >
            {BAHO_TURI_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'bahoBall',
        header: 'Ball',
        render: (row) => (
          <Input
            type="number"
            min={0}
            max={100}
            value={row.bahoBall}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, bahoBall: event.target.value } : item,
                ),
              }))
            }
            placeholder="Masalan: 4"
          />
        ),
      },
      {
        key: 'bahoMaxBall',
        header: 'Max ball',
        render: (row) => (
          <Input
            type="number"
            min={1}
            max={100}
            value={row.bahoMaxBall ?? 5}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, bahoMaxBall: event.target.value } : item,
                ),
              }))
            }
            placeholder="5"
          />
        ),
      },
      {
        key: 'bahoIzoh',
        header: 'Baho izoh',
        render: (row) => (
          <Input
            type="text"
            value={row.bahoIzoh || ''}
            onChange={(event) =>
              setDetail((prev) => ({
                ...prev,
                students: prev.students.map((item) =>
                  item.id === row.id ? { ...item, bahoIzoh: event.target.value } : item,
                ),
              }))
            }
            placeholder="Ixtiyoriy"
          />
        ),
      },
    ],
    [],
  );

  const tarixColumns = [
    { key: 'sana', header: 'Sana', render: (row) => row.sana },
    { key: 'sinf', header: 'Sinf', render: (row) => row.sinf },
    { key: 'fan', header: 'Fan', render: (row) => row.fan },
    { key: 'vaqtOraliq', header: 'Vaqt', render: (row) => row.vaqtOraliq },
    {
      key: 'holat',
      header: 'Holatlar',
      render: (row) =>
        `K:${row.holatlar?.KELDI || 0} / Kech:${row.holatlar?.KECHIKDI || 0} / Sab:${row.holatlar?.SABABLI || 0} / Sabs:${row.holatlar?.SABABSIZ || 0}`,
    },
    { key: 'jami', header: 'Jami', render: (row) => row.jami || 0 },
  ];

  async function handleSave() {
    if (!selectedDarsId || !detail?.students?.length) {
      toast.warning(t("Saqlash uchun studentlar ro'yxati topilmadi"));
      return;
    }

    setSaving(true);
    try {
      await apiRequest({
        path: `/api/teacher/davomat/dars/${selectedDarsId}`,
        method: 'POST',
        body: {
          sana,
          davomatlar: detail.students.map((student) => ({
            studentId: student.id,
            holat: student.holat,
            izoh: student.izoh || undefined,
            ...(student.bahoBall !== '' && student.bahoBall !== null && student.bahoBall !== undefined
              ? {
                  bahoBall: Number(student.bahoBall),
                  bahoMaxBall: Number(student.bahoMaxBall || 5),
                  bahoTuri: student.bahoTuri || 'JORIY',
                  bahoIzoh: student.bahoIzoh || undefined,
                }
              : {}),
          })),
        },
      });
      toast.success(t('Davomat saqlandi'));
      await loadDarslar(sana, oquvYili);
      await loadDetail(selectedDarsId, sana);
      await loadTarix(sana, tarixPeriodType, {
        page: tarixPage,
        limit: tarixLimit,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title={t("Davomat bo'limi")}>
        <div className="flex flex-wrap gap-2">
          {activeView === 'journal' ? (
            <Button variant="secondary" onClick={() => setActiveView('history')}>
              {t("O'tilgan darslar davomat tarixi")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setActiveView('journal')}>
              {t('Ortga qaytish')}
            </Button>
          )}
        </div>
      </Card>

      {activeView === 'journal' && (
        <>
      <Card title={t("Davomat jurnali")}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={oquvYili} onChange={(event) => setOquvYili(event.target.value)}>
            {oquvYillar.length ? (
              oquvYillar.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            ) : (
              <option value={oquvYili || ''}>{oquvYili || t("O'quv yili topilmadi")}</option>
            )}
          </Select>
          <Select value={selectedDarsId} onChange={(event) => setSelectedDarsId(event.target.value)}>
            {!darslar.length && <option value="">Bugun dars topilmadi</option>}
            {darslar.map((dars) => (
              <option key={dars.id} value={dars.id}>
                {dars.sinf?.name} - {dars.fan?.name} ({dars.vaqtOraliq?.boshlanishVaqti})
              </option>
            ))}
          </Select>
          <Button variant="indigo" onClick={() => loadDarslar(sana, oquvYili)}>
            {t('Yangilash')}
          </Button>
        </div>
      </Card>

      {loading && <StateView type="loading" />}

      {!loading && detail && (
        <Card
          title={`${detail.dars?.sinf?.name || ''} / ${detail.dars?.fan?.name || ''}`}
          subtitle={`${detail.sana} - ${detail.dars?.vaqtOraliq?.boshlanishVaqti || ''}`}
          actions={
            <Button variant="success" onClick={handleSave} disabled={saving}>
              {saving ? t('Saqlanmoqda...') : t('Davomatni saqlash')}
            </Button>
          }
        >
          {detail.students?.length ? (
            <DataTable columns={columns} rows={detail.students} maxHeightClassName="max-h-[520px]" />
          ) : (
            <StateView type="empty" description={t("Bu dars uchun studentlar topilmadi")} />
          )}
        </Card>
      )}
        </>
      )}

      {activeView === 'history' && (
        <Card title={t("O'tilgan darslar davomat tarixi")}>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
          <Select value={tarixPeriodType} onChange={(event) => setTarixPeriodType(event.target.value)}>
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Select
            value={String(tarixLimit)}
            onChange={(event) => {
              const nextLimit = Number(event.target.value);
              setTarixLimit(nextLimit);
              loadTarix(sana, tarixPeriodType, { page: 1, limit: nextLimit });
            }}
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {t('{{count}} ta / sahifa', { count: size })}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => loadTarix(sana, tarixPeriodType, { page: 1, limit: tarixLimit })}>
            {t('Tarixni yangilash')}
          </Button>
        </div>
        {tarixRange && (
          <p className="mb-2 text-xs text-slate-500">
            {t('Tanlangan oraliq')}: {tarixRange.from} - {tarixRange.to}
          </p>
        )}
        <p className="mb-2 text-xs text-slate-500">
          {t('Sahifa')}: {tarixPage} / {tarixPages}
        </p>
        {tarixLoading ? (
          <StateView type="loading" />
        ) : tarix.length ? (
          <>
            <DataTable columns={tarixColumns} rows={tarix} stickyHeader maxHeightClassName="max-h-[420px]" />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  loadTarix(sana, tarixPeriodType, {
                    page: Math.max(1, tarixPage - 1),
                    limit: tarixLimit,
                  })
                }
                disabled={tarixPage <= 1}
              >
                {t('Oldingi')}
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  loadTarix(sana, tarixPeriodType, {
                    page: Math.min(tarixPages, tarixPage + 1),
                    limit: tarixLimit,
                  })
                }
                disabled={tarixPage >= tarixPages}
              >
                {t('Keyingi')}
              </Button>
            </div>
          </>
        ) : (
          <StateView type="empty" description={t("Tanlangan period bo'yicha tarix topilmadi")} />
        )}
        </Card>
      )}
    </div>
  );
}
