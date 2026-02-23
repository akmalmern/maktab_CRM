import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Button, Card, DataTable, Input, Select, StateView } from '../../components/ui';
import { getLocalDateInputValue } from '../../lib/dateUtils';
import {
  useLazyGetTeacherAttendanceDarsDetailQuery,
  useLazyGetTeacherAttendanceDarslarQuery,
  useLazyGetTeacherAttendanceHistoryQuery,
  useSaveTeacherAttendanceDarsMutation,
} from '../../services/api/teacherApi';

const HOLAT_OPTIONS = ['KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ'];
const HOLAT_LABEL_KEYS = {
  KELDI: 'Keldi',
  KECHIKDI: 'Kechikdi',
  SABABLI: 'Sababli',
  SABABSIZ: 'Sababsiz',
};

const BAHO_TURI_OPTIONS = ['JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY'];
const BAHO_TURI_LABEL_KEYS = {
  JORIY: 'Joriy',
  NAZORAT: 'Nazorat',
  ORALIQ: 'Oraliq',
  YAKUNIY: 'Yakuniy',
};

const PERIOD_OPTIONS = ['KUNLIK', 'HAFTALIK', 'OYLIK', 'CHORAKLIK', 'YILLIK'];
const PERIOD_LABEL_KEYS = {
  KUNLIK: 'Kunlik',
  HAFTALIK: 'Haftalik',
  OYLIK: 'Oylik',
  CHORAKLIK: 'Choraklik',
  YILLIK: 'Yillik',
};

function holatLabel(t, value) {
  return t(HOLAT_LABEL_KEYS[value] || value, { defaultValue: value });
}

function bahoTuriLabel(t, value) {
  return t(BAHO_TURI_LABEL_KEYS[value] || value, { defaultValue: value });
}

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
  const [fetchDarslarQuery] = useLazyGetTeacherAttendanceDarslarQuery();
  const [fetchDarsDetailQuery] = useLazyGetTeacherAttendanceDarsDetailQuery();
  const [fetchTarixQuery] = useLazyGetTeacherAttendanceHistoryQuery();
  const [saveTeacherAttendance] = useSaveTeacherAttendanceDarsMutation();

  const loadDarslar = useCallback(async (nextSana, nextOquvYili = '') => {
    setLoading(true);
    try {
      const data = await fetchDarslarQuery({
        sana: nextSana,
        ...(nextOquvYili ? { oquvYili: nextOquvYili } : {}),
      }).unwrap();
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
      toast.error(error?.message || t("Darslar olinmadi"));
      setDarslar([]);
      setSelectedDarsId('');
      setOquvYillar([]);
    } finally {
      setLoading(false);
    }
  }, [fetchDarslarQuery, queryDarsId, t]);

  const loadDetail = useCallback(async (darsId, nextSana) => {
    if (!darsId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchDarsDetailQuery({ darsId, sana: nextSana }).unwrap();
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
      toast.error(error?.message || t("Davomat detali olinmadi"));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [fetchDarsDetailQuery, t]);

  const loadTarix = useCallback(async (nextSana, nextPeriodType, opts = {}) => {
    const nextPage = Number(opts.page || 1);
    const nextLimit = Number(opts.limit || 20);
    setTarixLoading(true);
    try {
      const data = await fetchTarixQuery({
        sana: nextSana,
        periodType: nextPeriodType,
        page: nextPage,
        limit: nextLimit,
      }).unwrap();
      setTarix(data.tarix || []);
      setTarixRange(data.period || null);
      setTarixPage(data.page || nextPage);
      setTarixLimit(data.limit || nextLimit);
      setTarixPages(data.pages || 1);
    } catch (error) {
      toast.error(error?.message || t("Davomat tarixi olinmadi"));
      setTarix([]);
      setTarixRange(null);
      setTarixPage(1);
      setTarixPages(1);
    } finally {
      setTarixLoading(false);
    }
  }, [fetchTarixQuery, t]);

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
      { key: 'fullName', header: t("O'quvchi"), render: (row) => row.fullName },
      { key: 'username', header: t('Username'), render: (row) => row.username || '-' },
      {
        key: 'holat',
        header: t('Holat'),
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
            {HOLAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {holatLabel(t, value)}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'izoh',
        header: t('Izoh'),
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
            placeholder={t('Ixtiyoriy')}
          />
        ),
      },
      {
        key: 'bahoTuri',
        header: t('Baho turi'),
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
            {BAHO_TURI_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {bahoTuriLabel(t, value)}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'bahoBall',
        header: t('Ball'),
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
            placeholder={t('Masalan: 4')}
          />
        ),
      },
      {
        key: 'bahoMaxBall',
        header: t('Max ball'),
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
        header: t('Baho izoh'),
        render: (row) => (
          <div className="space-y-2">
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
              placeholder={t('Ixtiyoriy')}
            />
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() =>
                setDetail((prev) => ({
                  ...prev,
                  students: prev.students.map((item) =>
                    item.id === row.id
                      ? {
                          ...item,
                          bahoBall: null,
                          bahoMaxBall: item.bahoMaxBall ?? 5,
                          bahoTuri: item.bahoTuri || 'JORIY',
                          bahoIzoh: '',
                        }
                      : item,
                  ),
                }))
              }
              disabled={row.bahoBall === '' || row.bahoBall === undefined}
              title={t("Saqlashdan keyin ushbu o'quvchining bahosi o'chiriladi")}
            >
              {t("Bahoni o'chirish")}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  const tarixColumns = [
    { key: 'sana', header: t('Sana'), render: (row) => row.sana },
    { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
    { key: 'fan', header: t('Fan'), render: (row) => row.fan },
    { key: 'vaqtOraliq', header: t('Vaqt'), render: (row) => row.vaqtOraliq },
    {
      key: 'holat',
      header: t('Holatlar'),
      render: (row) =>
        `${t('Keldi')}: ${row.holatlar?.KELDI || 0} / ${t('Kechikdi')}: ${row.holatlar?.KECHIKDI || 0} / ${t('Sababli')}: ${row.holatlar?.SABABLI || 0} / ${t('Sababsiz')}: ${row.holatlar?.SABABSIZ || 0}`,
    },
    { key: 'jami', header: t('Jami'), render: (row) => row.jami || 0 },
  ];

  const fieldLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';
  const fieldWrapClass = 'space-y-1.5';

  async function handleSave() {
    if (!selectedDarsId || !detail?.students?.length) {
      toast.warning(t("Saqlash uchun studentlar ro'yxati topilmadi"));
      return;
    }

    setSaving(true);
    try {
      await saveTeacherAttendance({
        darsId: selectedDarsId,
        payload: {
          sana,
          davomatlar: detail.students.map((student) => ({
            studentId: student.id,
            holat: student.holat,
            izoh: student.izoh || undefined,
            ...(student.bahoBall === null
              ? {
                  bahoBall: null,
                  bahoTuri: student.bahoTuri || 'JORIY',
                }
              : student.bahoBall !== '' &&
                  student.bahoBall !== undefined
                ? {
                    bahoBall: Number(student.bahoBall),
                    bahoMaxBall: Number(student.bahoMaxBall || 5),
                    bahoTuri: student.bahoTuri || 'JORIY',
                    bahoIzoh: student.bahoIzoh || undefined,
                  }
                : {}),
          })),
        },
      }).unwrap();
      toast.success(t('Davomat saqlandi'));
      await loadDarslar(sana, oquvYili);
      await loadDetail(selectedDarsId, sana);
      await loadTarix(sana, tarixPeriodType, {
        page: tarixPage,
        limit: tarixLimit,
      });
    } catch (error) {
      toast.error(error?.message || t('Davomat saqlanmadi'));
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
          <Card title={t("Davomat jurnali")} subtitle={t("Sana va darsni tanlab davomat hamda baholarni saqlang.")}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={fieldWrapClass}>
                <p className={fieldLabelClass}>{t('Sana')}</p>
                <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
              </div>
              <div className={fieldWrapClass}>
                <p className={fieldLabelClass}>{t("O'quv yili")}</p>
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
              </div>
              <div className={`${fieldWrapClass} xl:col-span-1`}>
                <p className={fieldLabelClass}>{t('Darsni tanlang')}</p>
                <Select value={selectedDarsId} onChange={(event) => setSelectedDarsId(event.target.value)}>
                  {!darslar.length && <option value="">{t('Bugun dars topilmadi')}</option>}
                  {darslar.map((dars) => (
                    <option key={dars.id} value={dars.id}>
                      {dars.sinf?.name} - {dars.fan?.name} ({dars.vaqtOraliq?.boshlanishVaqti})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="indigo" className="w-full" onClick={() => loadDarslar(sana, oquvYili)}>
                  {t('Yangilash')}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {t('Topilgan darslar')}: {darslar.length}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {t("Ko'rinish")}: {t('Jurnal')}
              </span>
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
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">{t("O'quvchilar")}</p>
                  <p className="font-semibold text-slate-900">{detail.students?.length || 0}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">{t('Fan')}</p>
                  <p className="truncate font-semibold text-slate-900">{detail.dars?.fan?.name || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">{t('Sinf')}</p>
                  <p className="font-semibold text-slate-900">{detail.dars?.sinf?.name || '-'}</p>
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-500">{t('Vaqt')}</p>
                  <p className="font-semibold text-slate-900">{detail.dars?.vaqtOraliq?.boshlanishVaqti || '-'}</p>
                </div>
              </div>
              {detail.students?.length ? (
                <DataTable
                  columns={columns}
                  rows={detail.students}
                  stickyFirstColumn
                  density="compact"
                  maxHeightClassName="max-h-[520px]"
                />
              ) : (
                <StateView type="empty" description={t("Bu dars uchun studentlar topilmadi")} />
              )}
            </Card>
          )}
        </>
      )}

      {activeView === 'history' && (
        <Card title={t("O'tilgan darslar davomat tarixi")}>
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={fieldWrapClass}>
              <p className={fieldLabelClass}>{t('Sana')}</p>
              <Input type="date" value={sana} onChange={(event) => setSana(event.target.value)} />
            </div>
            <div className={fieldWrapClass}>
              <p className={fieldLabelClass}>{t('Period')}</p>
              <Select value={tarixPeriodType} onChange={(event) => setTarixPeriodType(event.target.value)}>
                {PERIOD_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {t(PERIOD_LABEL_KEYS[value] || value)}
                  </option>
                ))}
              </Select>
            </div>
            <div className={fieldWrapClass}>
              <p className={fieldLabelClass}>{t('Sahifa limiti')}</p>
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
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => loadTarix(sana, tarixPeriodType, { page: 1, limit: tarixLimit })}
              >
                {t('Tarixni yangilash')}
              </Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {tarixRange && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {t('Tanlangan oraliq')}: {tarixRange.from} - {tarixRange.to}
              </span>
            )}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Sahifa')}: {tarixPage} / {tarixPages}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Jami yozuvlar')}: {tarix.length}
            </span>
          </div>
          {tarixLoading ? (
            <StateView type="loading" />
          ) : tarix.length ? (
            <>
              <DataTable
                columns={tarixColumns}
                rows={tarix}
                stickyHeader
                stickyFirstColumn
                density="compact"
                maxHeightClassName="max-h-[420px]"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
