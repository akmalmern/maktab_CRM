import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Badge, Button, Card, FilterToolbar, FilterToolbarItem, Input, Modal, Select, StateView, StatusBadge, Textarea } from '../../components/ui';
import {
  useCreateManagerDebtorNoteMutation,
  useCreateManagerPaymentMutation,
  useLazyGetManagerClassroomsQuery,
  useLazyGetManagerDebtorNotesQuery,
  useLazyGetManagerDebtorsQuery,
  useLazyGetManagerPaymentStudentDetailQuery,
} from '../../services/api/managerApi';

const SEARCH_DEBOUNCE_MS = 400;
const NOTES_PAGE_LIMIT = 10;

function resolveLocale(language) {
  if (language === 'ru') return 'ru-RU';
  if (language === 'en') return 'en-US';
  return 'uz-UZ';
}

function sumFormat(value, locale) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/,/g, ' ');
}

function formatMoney(value, locale, t) {
  return `${sumFormat(value, locale)} ${t("so'm")}`;
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateTime(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(locale);
}

function formatDate(value, locale) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale);
}

function MonthChips({ items = [] }) {
  if (!items.length) return <span className="text-slate-400">-</span>;
  const visible = items.slice(0, 3);
  const hiddenCount = Math.max(0, items.length - 3);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <Badge key={item} variant="danger" className="px-2 py-1 font-medium shadow-none">
          {item}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge className="px-2 py-1 font-medium shadow-none">
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}

export default function ManagerDebtorsPage() {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const [classrooms, setClassrooms] = useState([]);
  const [query, setQuery] = useState({
    search: '',
    classroomId: 'all',
    page: 1,
    limit: 20,
  });
  const [refreshTick, setRefreshTick] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [studentsState, setStudentsState] = useState({
    loading: true,
    error: '',
    items: [],
    total: 0,
    pages: 0,
    summary: {
      totalDebtors: 0,
      totalDebtAmount: 0,
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [noteForm, setNoteForm] = useState({ izoh: '', promisedPayDate: '' });
  const [notesState, setNotesState] = useState({
    loading: false,
    error: '',
    items: [],
    page: 1,
    pages: 0,
    total: 0,
  });
  const [savingNote, setSavingNote] = useState(false);
  const [quickPayLoadingId, setQuickPayLoadingId] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentState, setPaymentState] = useState({
    loading: false,
    error: '',
    student: null,
    transactions: [],
  });
  const [fetchManagerClassrooms] = useLazyGetManagerClassroomsQuery();
  const [fetchManagerDebtors] = useLazyGetManagerDebtorsQuery();
  const [fetchManagerNotes] = useLazyGetManagerDebtorNotesQuery();
  const [createManagerNote] = useCreateManagerDebtorNoteMutation();
  const [fetchManagerPaymentDetail] = useLazyGetManagerPaymentStudentDetailQuery();
  const [createManagerPayment] = useCreateManagerPaymentMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(query.search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query.search]);

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        const data = await fetchManagerClassrooms().unwrap();
        if (!active) return;
        setClassrooms(data.classrooms || []);
      } catch (error) {
        if (!active) return;
        toast.error(error?.message || t("Sinflar olinmadi"));
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [fetchManagerClassrooms, t]);

  useEffect(() => {
    let active = true;
    async function run() {
      setStudentsState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await fetchManagerDebtors({
          page: query.page,
          limit: query.limit,
          search: debouncedSearch || undefined,
          classroomId: query.classroomId === 'all' ? undefined : query.classroomId,
        }).unwrap();
        if (!active) return;
        setStudentsState({
          loading: false,
          error: '',
          items: data.students || [],
          total: data.total || 0,
          pages: data.pages || 0,
          summary: data.summary || {
            totalDebtors: 0,
            totalDebtAmount: 0,
          },
        });
      } catch (error) {
        if (!active) return;
        setStudentsState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || t("Qarzdorlar olinmadi"),
        }));
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [query.page, query.limit, query.classroomId, debouncedSearch, refreshTick, fetchManagerDebtors, t]);

  const summaryCards = useMemo(
    () => [
      { label: t('Jami qarzdorlar'), value: Number(studentsState.summary?.totalDebtors || 0) },
      { label: t("Jami qarz summasi"), value: formatMoney(studentsState.summary?.totalDebtAmount || 0, locale, t) },
      { label: t('Sahifa'), value: `${query.page} / ${studentsState.pages || 1}` },
    ],
    [studentsState.summary, studentsState.pages, query.page, locale, t],
  );
  const fieldLabelClass = 'text-xs font-medium uppercase tracking-wide text-slate-500';
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

  async function reloadDebtors() {
    setRefreshTick((prev) => prev + 1);
  }

  async function loadNotes(studentId, page = 1) {
    setNotesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchManagerNotes({ studentId, page, limit: NOTES_PAGE_LIMIT }).unwrap();
      setNotesState({
        loading: false,
        error: '',
        items: data.notes || [],
        page: data.page || 1,
        pages: data.pages || 0,
        total: data.total || 0,
      });
    } catch (error) {
      setNotesState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || t("Izohlar olinmadi"),
      }));
    }
  }

  async function openModal(student) {
    setSelectedStudent(student);
    setNoteForm({ izoh: '', promisedPayDate: '' });
    setModalOpen(true);
    await loadNotes(student.id, 1);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setNotesState({
      loading: false,
      error: '',
      items: [],
      page: 1,
      pages: 0,
      total: 0,
    });
    setNoteForm({ izoh: '', promisedPayDate: '' });
  }

  async function handleSaveNote(e) {
    e.preventDefault();
    if (!selectedStudent) return;
    const izoh = noteForm.izoh.trim();
    if (!izoh) {
      toast.warning(t("Izoh maydoni bo'sh bo'lishi mumkin emas"));
      return;
    }

    setSavingNote(true);
    try {
      await createManagerNote({
        studentId: selectedStudent.id,
        payload: {
          izoh,
          promisedPayDate: noteForm.promisedPayDate || undefined,
        },
      }).unwrap();
      toast.success(t('Izoh saqlandi'));
      setNoteForm({ izoh: '', promisedPayDate: '' });
      await Promise.all([loadNotes(selectedStudent.id, 1), reloadDebtors()]);
    } catch (error) {
      toast.error(error?.message || t("Izoh saqlanmadi"));
    } finally {
      setSavingNote(false);
    }
  }

  function firstDebtMonth(row) {
    return row?.qarzOylar?.[0] || currentMonthKey();
  }

  async function loadPaymentDetail(studentId) {
    setPaymentState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchManagerPaymentDetail(studentId).unwrap();
      setPaymentState({
        loading: false,
        error: '',
        student: data.student || null,
        transactions: data.transactions || [],
      });
    } catch (error) {
      setPaymentState({
        loading: false,
        error: error?.message || t("To'lov ma'lumotlari olinmadi"),
        student: null,
        transactions: [],
      });
    }
  }

  async function openPaymentHistory(row) {
    setPaymentStudent(row);
    setPaymentModalOpen(true);
    await loadPaymentDetail(row.id);
  }

  function closePaymentModal() {
    setPaymentModalOpen(false);
    setPaymentStudent(null);
    setPaymentState({
      loading: false,
      error: '',
      student: null,
      transactions: [],
    });
  }

  async function handleQuickPay(row, mode) {
    if (!row?.id) return;

    const oylarSoni =
      mode === 'ALL'
        ? Math.max(1, Number(row.qarzOylarSoni || 1))
        : 1;

    setQuickPayLoadingId(row.id + mode);
    try {
      await createManagerPayment({
        studentId: row.id,
        payload: {
          turi: 'OYLIK',
          startMonth: firstDebtMonth(row),
          oylarSoni,
        },
      }).unwrap();
      toast.success(mode === 'ALL' ? t("Qarz to'liq yopildi") : t("1 oy to'landi"));
      await reloadDebtors();
      if (paymentModalOpen && paymentStudent?.id === row.id) {
        await loadPaymentDetail(row.id);
      }
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
    } finally {
      setQuickPayLoadingId('');
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title={t("Qarzdorlar ro'yxati")}
        subtitle={t("Menejer faqat qarzdor o'quvchilar bilan ishlaydi va ota-ona bilan aloqa izohini yozadi.")}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className={statCardClass}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <FilterToolbar
          className="mt-4 mb-0"
          gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          onReset={() => setQuery((prev) => ({ ...prev, search: '', classroomId: 'all', page: 1, limit: 20 }))}
          resetLabel={t('Filterlarni tozalash')}
          resetDisabled={query.search === '' && query.classroomId === 'all' && Number(query.limit) === 20}
          actions={(
            <Button variant="secondary" size="sm" onClick={reloadDebtors}>
              {t('Yangilash')}
            </Button>
          )}
        >
          <FilterToolbarItem label={t('Qidiruv')}>
            <Input
              type="text"
              value={query.search}
              onChange={(e) => setQuery((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder={t('Ism, username yoki ota-ona telefoni...')}
            />
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Sinf filtri')}>
            <Select
              value={query.classroomId}
              onChange={(e) => setQuery((prev) => ({ ...prev, classroomId: e.target.value, page: 1 }))}
            >
              <option value="all">{t('Barcha sinflar')}</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} ({classroom.academicYear})
                </option>
              ))}
            </Select>
          </FilterToolbarItem>
          <FilterToolbarItem label={t('Sahifa limiti')}>
            <Select
              value={String(query.limit)}
              onChange={(e) => setQuery((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {t('{{count}} ta / sahifa', { count: size })}
                </option>
              ))}
            </Select>
          </FilterToolbarItem>
          <FilterToolbarItem label={t("Ko'rinish")}>
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
              {t("Qarzdorlar ro'yxati")}
            </div>
          </FilterToolbarItem>
        </FilterToolbar>

        <div className="mt-3">
          {studentsState.loading && <StateView type="loading" />}
          {!studentsState.loading && studentsState.error && (
            <StateView type="error" description={studentsState.error} />
          )}
          {!studentsState.loading && !studentsState.error && !studentsState.items.length && (
            <StateView type="empty" description={t("Qarzdor o'quvchi topilmadi.")} />
          )}

          {!studentsState.loading && !studentsState.error && studentsState.items.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {t('Jami')}: {studentsState.total || 0}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  {t('Sahifa')}: {query.page} / {studentsState.pages || 1}
                </span>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-200/50">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-100/80 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">{t("O'quvchi")}</th>
                    <th className="px-3 py-2">{t('Sinf')}</th>
                    <th className="px-3 py-2">{t('Ota-ona telefoni')}</th>
                    <th className="px-3 py-2">{t('Qarz oylar')}</th>
                    <th className="px-3 py-2">{t('Jami qarz')}</th>
                    <th className="px-3 py-2">{t('Oxirgi izoh')}</th>
                    <th className="px-3 py-2">{t('Amallar')}</th>
                  </tr>
                </thead>
                  <tbody>
                  {studentsState.items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">@{row.username}</p>
                      </td>
                      <td className="px-3 py-2">{row.classroom}</td>
                      <td className="px-3 py-2">
                        {row.parentPhone && row.parentPhone !== '-' ? (
                          <a
                            href={`tel:${row.parentPhone}`}
                            className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
                          >
                            {row.parentPhone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <p className="mb-1">
                          <Badge variant="danger" className="shadow-none">
                            {row.qarzOylarSoni} {t('ta')}
                          </Badge>
                        </p>
                        <MonthChips items={row.qarzOylarFormatted || []} />
                      </td>
                      <td className="px-3 py-2 font-semibold text-rose-700">
                        {formatMoney(row.jamiQarzSumma, locale, t)}
                      </td>
                      <td className="px-3 py-2">
                        {row.oxirgiIzoh ? (
                          <div>
                            <p className="max-w-[260px] text-slate-700">{row.oxirgiIzoh.izoh}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(row.oxirgiIzoh.createdAt, locale)} | {row.oxirgiIzoh.manager?.fullName || '-'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">{t("Izoh yo'q")}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleQuickPay(row, 'ONE')}
                            disabled={quickPayLoadingId === row.id + 'ONE' || quickPayLoadingId === row.id + 'ALL'}
                          >
                            {t("1 oy to'lash")}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickPay(row, 'ALL')}
                            disabled={quickPayLoadingId === row.id + 'ONE' || quickPayLoadingId === row.id + 'ALL'}
                          >
                            {t('Qarzni yopish')}
                          </Button>
                          <Button size="sm" variant="indigo" onClick={() => openPaymentHistory(row)}>
                            {t('Tarix')}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openModal(row)}>
                            {t('Izohlar')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setQuery((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={query.page <= 1}
          >
            {t('Oldingi')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setQuery((prev) => ({
                ...prev,
                page: Math.min(studentsState.pages || 1, prev.page + 1),
              }))
            }
            disabled={query.page >= (studentsState.pages || 1)}
          >
            {t('Keyingi')}
          </Button>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={t('Ota-ona bilan aloqa izohlari')} maxWidth="max-w-4xl">
        {!selectedStudent ? (
          <StateView type="empty" description={t("O'quvchi tanlanmagan.")} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm shadow-sm ring-1 ring-slate-200/50">
              <p className="font-semibold text-slate-900">{selectedStudent.fullName}</p>
              <p className="mt-1 text-slate-600">{t('Sinf')}: {selectedStudent.classroom}</p>
              <p className="text-slate-600">
                {t('Ota-ona telefoni')}:{' '}
                {selectedStudent.parentPhone && selectedStudent.parentPhone !== '-' ? (
                  <a
                    href={`tel:${selectedStudent.parentPhone}`}
                    className="font-semibold text-indigo-700 underline-offset-2 hover:underline"
                  >
                    {selectedStudent.parentPhone}
                  </a>
                ) : (
                  '-'
                )}
              </p>
              <p className="mt-1 text-rose-700">
                {t('Qarz')}: <b>{selectedStudent.qarzOylarSoni}</b> {t('oy')} /{' '}
                <b>{formatMoney(selectedStudent.jamiQarzSumma, locale, t)}</b>
              </p>
            </div>

            <form
              onSubmit={handleSaveNote}
              className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50"
            >
              <p className="text-sm font-semibold text-slate-900">{t("Yangi izoh qo'shish")}</p>
              <Textarea
                rows={3}
                value={noteForm.izoh}
                onChange={(e) => setNoteForm((prev) => ({ ...prev, izoh: e.target.value }))}
                placeholder={t("Masalan: Ota-onasi bilan gaplashildi, keyingi haftada to'lov qilishini aytdi.")}
                required
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <p className={fieldLabelClass}>{t("Va'da qilingan sana")}</p>
                  <Input
                    type="date"
                    value={noteForm.promisedPayDate}
                    onChange={(e) => setNoteForm((prev) => ({ ...prev, promisedPayDate: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" variant="success" className="w-full" disabled={savingNote}>
                    {savingNote ? t('Saqlanmoqda...') : t("Izohni saqlash")}
                  </Button>
                </div>
              </div>
            </form>

            <Card title={t('Izohlar tarixi ({{count}})', { count: notesState.total })}>
              {notesState.loading && <StateView type="loading" />}
              {!notesState.loading && notesState.error && (
                <StateView type="error" description={notesState.error} />
              )}
              {!notesState.loading && !notesState.error && !notesState.items.length && (
                <StateView type="empty" description={t("Hali izoh kiritilmagan.")} />
              )}
              {!notesState.loading && !notesState.error && notesState.items.length > 0 && (
                <div className="space-y-2">
                  {notesState.items.map((note) => (
                    <div key={note.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <p className="text-slate-800">{note.izoh}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{t('Yozilgan vaqt')}: {formatDateTime(note.createdAt, locale)}</span>
                        <span>{t('Manager')}: {note.manager?.fullName || note.manager?.username || '-'}</span>
                        <span>{t("Va'da qilingan sana")}: {formatDate(note.promisedPayDate, locale)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => loadNotes(selectedStudent.id, Math.max(1, notesState.page - 1))}
                  disabled={notesState.page <= 1 || notesState.loading}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    loadNotes(
                      selectedStudent.id,
                      Math.min(notesState.pages || 1, notesState.page + 1),
                    )
                  }
                  disabled={notesState.page >= (notesState.pages || 1) || notesState.loading}
                >
                  {t('Keyingi')}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>

      <Modal open={paymentModalOpen} onClose={closePaymentModal} title={t("To'lovlar tarixi")} maxWidth="max-w-4xl">
        {!paymentStudent ? (
          <StateView type="empty" description={t("O'quvchi tanlanmagan.")} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm shadow-sm ring-1 ring-slate-200/50">
              <p className="font-semibold text-slate-900">{paymentStudent.fullName}</p>
              <p className="mt-1 text-slate-600">{t('Sinf')}: {paymentStudent.classroom}</p>
              <p className="text-slate-600">
                {t('Qarz')}: <b>{paymentStudent.qarzOylarSoni}</b> {t('oy')} / <b>{formatMoney(paymentStudent.jamiQarzSumma, locale, t)}</b>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="success"
                onClick={() => handleQuickPay(paymentStudent, 'ONE')}
                disabled={quickPayLoadingId === paymentStudent.id + 'ONE' || quickPayLoadingId === paymentStudent.id + 'ALL'}
              >
                {t("1 oy to'lash")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickPay(paymentStudent, 'ALL')}
                disabled={quickPayLoadingId === paymentStudent.id + 'ONE' || quickPayLoadingId === paymentStudent.id + 'ALL'}
              >
                {t('Qarzni yopish')}
              </Button>
            </div>

            <Card title={t("To'lov tranzaksiyalari")}>
              {paymentState.loading && <StateView type="loading" />}
              {!paymentState.loading && paymentState.error && (
                <StateView type="error" description={paymentState.error} />
              )}
              {!paymentState.loading && !paymentState.error && !paymentState.transactions.length && (
                <StateView type="empty" description={t("To'lov tarixi yo'q.")} />
              )}
              {!paymentState.loading && !paymentState.error && paymentState.transactions.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-200/50">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-100/80 text-left text-slate-600">
                      <tr>
                        <th className="px-3 py-2">{t('Sana')}</th>
                        <th className="px-3 py-2">{t('Turi')}</th>
                        <th className="px-3 py-2">{t('Holat')}</th>
                        <th className="px-3 py-2">{t('Summa')}</th>
                        <th className="px-3 py-2">{t('Qoplangan oylar')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentState.transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-slate-100">
                          <td className="px-3 py-2">{formatDateTime(tx.tolovSana, locale)}</td>
                          <td className="px-3 py-2">{t(tx.turi, { defaultValue: tx.turi })}</td>
                          <td className="px-3 py-2">
                            <StatusBadge domain="financeTransaction" value={tx.holat} className="shadow-none" />
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(tx.summa, locale, t)}</td>
                          <td className="px-3 py-2">
                            {(tx.qoplanganOylarFormatted || []).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
      </div>
  );
}
