import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Badge, Button, Card, FilterToolbar, FilterToolbarItem, Input, Modal, Select, StateView, StatusBadge, Textarea } from '../../components/ui';
import {
  useCreateManagerDebtorNoteMutation,
  useCreateManagerPaymentMutation,
  useCreateManagerImtiyozMutation,
  useDeactivateManagerImtiyozMutation,
  useLazyGetManagerClassroomsQuery,
  useLazyGetManagerDebtorNotesQuery,
  useLazyGetManagerDebtorsQuery,
  useLazyGetManagerPaymentStudentDetailQuery,
  usePreviewManagerPaymentMutation,
  useRevertManagerPaymentMutation,
} from '../../services/api/managerApi';

const SEARCH_DEBOUNCE_MS = 400;
const NOTES_PAGE_LIMIT = 10;
const MANAGER_DEBTORS_LIMIT = 500;

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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function createClientRequestKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function toMonthNumber(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return year * 12 + month;
}

function fromMonthNumber(value) {
  const year = Math.floor((value - 1) / 12);
  const month = value - year * 12;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildMonthRange(startMonth, count) {
  const startValue = toMonthNumber(startMonth);
  const limit = Number(count || 0);
  if (!startValue || !Number.isFinite(limit) || limit < 1) return [];
  return Array.from({ length: limit }, (_, idx) => fromMonthNumber(startValue + idx));
}

function formatMonthKey(value, locale = 'uz-UZ') {
  const [y, m] = String(value || '').split('-');
  const year = Number(y);
  const month = Number(m);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value || '-';
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

function monthKeyToDateInputValue(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return `${currentMonthKey()}-01`;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function dateInputValueToMonthKey(dateValue) {
  const [yearStr, monthStr] = String(dateValue || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return currentMonthKey();
  return `${year}-${String(month).padStart(2, '0')}`;
}

function buildManagerPaymentPreview(detailStudent, paymentForm) {
  if (!detailStudent) return null;
  const debtAmountMap = new Map((detailStudent.qarzOylarDetal || []).map((i) => [i.key, Number(i.oySumma || 0)]));
  const monthsToClose =
    paymentForm.turi === 'YILLIK'
      ? buildMonthRange(paymentForm.startMonth, 12)
      : buildMonthRange(paymentForm.startMonth, Number(paymentForm.oylarSoni || 1));
  const debtClosingMonths = monthsToClose.filter((k) => debtAmountMap.has(k));
  const debtExpectedSumma = debtClosingMonths.reduce((acc, key) => acc + Number(debtAmountMap.get(key) || 0), 0);
  const entered = Number(paymentForm.summa || 0);
  const hasEntered = entered > 0;
  const expectedSumma = debtExpectedSumma;
  const finalSumma = hasEntered ? entered : expectedSumma;
  const requireManual = paymentForm.turi === 'IXTIYORIY';
  const valid = requireManual ? hasEntered : expectedSumma > 0 || hasEntered;
  return {
    monthsToClose,
    debtClosingMonths,
    expectedSumma,
    finalSumma,
    valid,
    previewMonthsCount: monthsToClose.length,
    alreadyPaidMonthsFormatted: [],
  };
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

function managerSelectedClassRecordsLabel(language) {
  if (language === 'ru') return '\u0417\u0430\u043f\u0438\u0441\u0438 \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u043a\u043b\u0430\u0441\u0441\u0430';
  if (language === 'ru') return 'Записи выбранного класса';
  if (language === 'en') return 'Selected class records';
  return "Tanlangan sinf yozuvlari";
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
    classroomId: '',
    page: 1,
    limit: MANAGER_DEBTORS_LIMIT,
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
  const [globalSummaryState, setGlobalSummaryState] = useState({
    loading: true,
    error: '',
    totalDebtors: 0,
    totalDebtAmount: 0,
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');
  const [paymentStudent, setPaymentStudent] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    turi: 'OYLIK',
    startMonth: currentMonthKey(),
    oylarSoni: 1,
    summa: '',
    izoh: '',
  });
  const [imtiyozForm, setImtiyozForm] = useState({
    turi: 'FOIZ',
    boshlanishOy: currentMonthKey(),
    oylarSoni: 1,
    qiymat: '',
    sabab: '',
    izoh: '',
  });
  const [paymentRequestKey, setPaymentRequestKey] = useState(() => createClientRequestKey());
  const [serverPreviewState, setServerPreviewState] = useState({ loading: false, error: '', data: null });
  const [paymentState, setPaymentState] = useState({
    loading: false,
    error: '',
    student: null,
    transactions: [],
    imtiyozlar: [],
  });
  const [fetchManagerClassrooms] = useLazyGetManagerClassroomsQuery();
  const [fetchManagerDebtors] = useLazyGetManagerDebtorsQuery();
  const [fetchManagerDebtorsSummary] = useLazyGetManagerDebtorsQuery();
  const [fetchManagerNotes] = useLazyGetManagerDebtorNotesQuery();
  const [createManagerNote] = useCreateManagerDebtorNoteMutation();
  const [fetchManagerPaymentDetail] = useLazyGetManagerPaymentStudentDetailQuery();
  const [previewManagerPayment] = usePreviewManagerPaymentMutation();
  const [createManagerPayment, createManagerPaymentState] = useCreateManagerPaymentMutation();
  const [createManagerImtiyoz, createManagerImtiyozState] = useCreateManagerImtiyozMutation();
  const [deactivateManagerImtiyoz, deactivateManagerImtiyozState] = useDeactivateManagerImtiyozMutation();
  const [revertManagerPayment, revertManagerPaymentState] = useRevertManagerPaymentMutation();

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
    if (query.classroomId) return;
    const firstClassroomId = classrooms?.[0]?.id;
    if (!firstClassroomId) return;
    setQuery((prev) => ({ ...prev, classroomId: firstClassroomId, page: 1 }));
  }, [classrooms, query.classroomId]);

  useEffect(() => {
    let active = true;
    async function runGlobalSummary() {
      setGlobalSummaryState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await fetchManagerDebtorsSummary({
          page: 1,
          limit: 1,
        }).unwrap();
        if (!active) return;
        setGlobalSummaryState({
          loading: false,
          error: '',
          totalDebtors: Number(data?.summary?.totalDebtors || 0),
          totalDebtAmount: Number(data?.summary?.totalDebtAmount || 0),
        });
      } catch (error) {
        if (!active) return;
        setGlobalSummaryState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || t("Qarzdorlar olinmadi"),
        }));
      }
    }
    runGlobalSummary();
    return () => {
      active = false;
    };
  }, [refreshTick, fetchManagerDebtorsSummary, t]);

  useEffect(() => {
    if (!query.classroomId) {
      setStudentsState((prev) => ({
        ...prev,
        loading: false,
        error: '',
        items: [],
      }));
      return undefined;
    }
    let active = true;
    async function run() {
      setStudentsState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await fetchManagerDebtors({
          page: query.page,
          limit: query.limit,
          search: debouncedSearch || undefined,
          classroomId: query.classroomId,
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
      {
        label: `${t('Jami qarzdorlar')} (${t('umumiy')})`,
        value: globalSummaryState.loading ? '...' : Number(globalSummaryState.totalDebtors || 0),
      },
      {
        label: `${t("Jami qarz summasi")} (${t('umumiy')})`,
        value: globalSummaryState.loading
          ? '...'
          : formatMoney(globalSummaryState.totalDebtAmount || 0, locale, t),
      },
      { label: managerSelectedClassRecordsLabel(i18n.language), value: Number(studentsState.total || 0) },
    ],
    [
      globalSummaryState.loading,
      globalSummaryState.totalDebtors,
      globalSummaryState.totalDebtAmount,
      studentsState.total,
      i18n.language,
      locale,
      t,
    ],
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
        imtiyozlar: data.imtiyozlar || [],
        majburiyatlar: data.majburiyatlar || [],
      });
    } catch (error) {
      setPaymentState({
        loading: false,
        error: error?.message || t("To'lov ma'lumotlari olinmadi"),
        student: null,
        transactions: [],
        imtiyozlar: [],
        majburiyatlar: [],
      });
    }
  }

  async function openPaymentHistory(row) {
    setPaymentStudent(row);
    setPaymentModalTab('payment');
    setPaymentForm({
      turi: 'OYLIK',
      startMonth: firstDebtMonth(row),
      oylarSoni: 1,
      summa: '',
      izoh: '',
    });
    setImtiyozForm({
      turi: 'FOIZ',
      boshlanishOy: firstDebtMonth(row),
      oylarSoni: 1,
      qiymat: '',
      sabab: '',
      izoh: '',
    });
    setPaymentRequestKey(createClientRequestKey());
    setServerPreviewState({ loading: false, error: '', data: null });
    setPaymentModalOpen(true);
    await loadPaymentDetail(row.id);
  }

  function closePaymentModal() {
    setPaymentModalOpen(false);
    setPaymentModalTab('payment');
    setPaymentStudent(null);
    setPaymentState({
      loading: false,
      error: '',
      student: null,
      transactions: [],
      imtiyozlar: [],
      majburiyatlar: [],
    });
    setServerPreviewState({ loading: false, error: '', data: null });
    setPaymentRequestKey(createClientRequestKey());
  }

  const localPaymentPreview = useMemo(
    () => buildManagerPaymentPreview(paymentState.student, paymentForm),
    [paymentState.student, paymentForm],
  );

  const mergedPaymentPreview = useMemo(() => {
    if (!localPaymentPreview) return null;
    const server = serverPreviewState.data?.preview;
    if (!server) return localPaymentPreview;
    return {
      ...localPaymentPreview,
      expectedSumma: Number(server.expectedSumma ?? localPaymentPreview.expectedSumma ?? 0),
      finalSumma: Number(server.finalSumma ?? localPaymentPreview.finalSumma ?? 0),
      debtClosingMonths: Array.isArray(server.appliedMonths) ? server.appliedMonths : localPaymentPreview.debtClosingMonths,
      monthsToClose: Array.isArray(server.monthsToClose) ? server.monthsToClose : localPaymentPreview.monthsToClose,
      previewMonthsCount: Number(server.previewMonthsCount || localPaymentPreview.previewMonthsCount || 0),
      valid: Boolean(server.canSubmit),
      serverPreview: server,
      alreadyPaidMonthsFormatted: (server.alreadyPaidMonthsFormatted || []),
    };
  }, [localPaymentPreview, serverPreviewState.data]);

  useEffect(() => {
    if (!paymentModalOpen || paymentModalTab !== 'payment' || !paymentStudent?.id) return undefined;
    if (!paymentForm.startMonth) return undefined;
    const timer = setTimeout(async () => {
      setServerPreviewState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await previewManagerPayment({
          studentId: paymentStudent.id,
          payload: {
            turi: paymentForm.turi,
            startMonth: paymentForm.startMonth,
            oylarSoni: paymentForm.turi === 'YILLIK' ? 12 : Number(paymentForm.oylarSoni || 1),
            ...(paymentForm.summa !== '' ? { summa: Number(paymentForm.summa) } : {}),
            ...(paymentForm.izoh ? { izoh: paymentForm.izoh } : {}),
          },
        }).unwrap();
        setServerPreviewState({ loading: false, error: '', data });
      } catch (error) {
        setServerPreviewState({ loading: false, error: error?.message || t("To'lov ma'lumotlari olinmadi"), data: null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [paymentModalOpen, paymentModalTab, paymentStudent?.id, paymentForm, previewManagerPayment, t]);

  async function handleSubmitPayment(e) {
    e?.preventDefault?.();
    if (!paymentStudent?.id) return;
    try {
      await createManagerPayment({
        studentId: paymentStudent.id,
        payload: {
          turi: paymentForm.turi,
          startMonth: paymentForm.startMonth,
          oylarSoni: paymentForm.turi === 'YILLIK' ? 12 : Number(paymentForm.oylarSoni || 1),
          ...(paymentForm.summa !== '' ? { summa: Number(paymentForm.summa) } : {}),
          ...(paymentForm.izoh ? { izoh: paymentForm.izoh } : {}),
          idempotencyKey: paymentRequestKey,
        },
      }).unwrap();
      toast.success(t("To'lov saqlandi"));
      setPaymentRequestKey(createClientRequestKey());
      setPaymentForm((prev) => ({ ...prev, summa: '', izoh: '' }));
      await Promise.all([loadPaymentDetail(paymentStudent.id), reloadDebtors()]);
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
    }
  }

  async function handleCreateImtiyoz(e) {
    e?.preventDefault?.();
    if (!paymentStudent?.id) return;
    try {
      await createManagerImtiyoz({
        studentId: paymentStudent.id,
        payload: {
          turi: imtiyozForm.turi,
          boshlanishOy: imtiyozForm.boshlanishOy,
          oylarSoni: Number(imtiyozForm.oylarSoni || 1),
          ...(imtiyozForm.qiymat !== '' && imtiyozForm.turi !== 'TOLIQ_OZOD' ? { qiymat: Number(imtiyozForm.qiymat) } : {}),
          sabab: imtiyozForm.sabab,
          ...(imtiyozForm.izoh ? { izoh: imtiyozForm.izoh } : {}),
        },
      }).unwrap();
      toast.success(t("Imtiyoz saqlandi"));
      setImtiyozForm((prev) => ({ ...prev, qiymat: '', sabab: '', izoh: '' }));
      await Promise.all([loadPaymentDetail(paymentStudent.id), reloadDebtors()]);
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz saqlanmadi"));
    }
  }

  async function handleDeactivateImtiyoz(imtiyozId) {
    if (!imtiyozId || !paymentStudent?.id) return;
    try {
      await deactivateManagerImtiyoz({ imtiyozId, payload: {} }).unwrap();
      toast.success(t("Imtiyoz bekor qilindi"));
      await Promise.all([loadPaymentDetail(paymentStudent.id), reloadDebtors()]);
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz bekor qilinmadi"));
    }
  }

  async function handleRevertPayment(tolovId) {
    if (!tolovId || !paymentStudent?.id) return;
    try {
      await revertManagerPayment(tolovId).unwrap();
      toast.success(t("To'lov saqlandi"));
      await Promise.all([loadPaymentDetail(paymentStudent.id), reloadDebtors()]);
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
    }
  }

  function fillAllDebtIntoPaymentForm() {
    if (!paymentStudent) return;
    setPaymentForm((prev) => ({
      ...prev,
      turi: 'OYLIK',
      startMonth: firstDebtMonth(paymentStudent),
      oylarSoni: Math.max(1, Number(paymentStudent.qarzOylarSoni || 1)),
      summa: '',
    }));
  }

  const paymentActionLoading =
    createManagerPaymentState.isLoading ||
    createManagerImtiyozState.isLoading ||
    deactivateManagerImtiyozState.isLoading ||
    revertManagerPaymentState.isLoading;

  function paymentTypeLabel(type) {
    if (type === 'YILLIK') return t('Yillik');
    if (type === 'IXTIYORIY') return t('Ixtiyoriy');
    return t('Oylik');
  }

  function imtiyozTypeLabel(type) {
    if (type === 'FOIZ') return t('Foiz');
    if (type === 'SUMMA') return t('Summa');
    if (type === 'TOLIQ_OZOD') return t("To'liq ozod");
    return type || '-';
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
        <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
          {t("Yuqoridagi kartalar umumiy statistika. Pastdagi jadval tanlangan sinf bo'yicha ko'rsatiladi.")}
          {globalSummaryState.error ? ` (${globalSummaryState.error})` : ''}
        </div>

        <FilterToolbar
          className="mt-4 mb-0"
          gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
          onReset={() =>
            setQuery((prev) => ({
              ...prev,
              classroomId: classrooms?.[0]?.id || '',
              page: 1,
              limit: MANAGER_DEBTORS_LIMIT,
            }))
          }
          resetLabel={t('Filterlarni tozalash')}
          resetDisabled={query.classroomId === (classrooms?.[0]?.id || '')}
          actions={(
            <Button variant="secondary" size="sm" onClick={reloadDebtors}>
              {t('Yangilash')}
            </Button>
          )}
        >
          <FilterToolbarItem label={t('Sinf filtri')}>
            <Select
              value={query.classroomId}
              onChange={(e) => setQuery((prev) => ({ ...prev, classroomId: e.target.value, page: 1 }))}
            >
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} ({classroom.academicYear})
                </option>
              ))}
            </Select>
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
              </div>
              <div className="max-h-[60vh] overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-200/50">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t("O'quvchi")}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Sinf')}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Username')}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Holat')}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Qarz oylar')}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Jami qarz')}</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Amal')}</th>
                  </tr>
                </thead>
                  <tbody>
                  {studentsState.items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top bg-white hover:bg-slate-50/60">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">@{row.username}</p>
                      </td>
                      <td className="px-3 py-2">{row.classroom}</td>
                      <td className="px-3 py-2">{row.username}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          domain="financeStudent"
                          value={Number(row.jamiQarzSumma || 0) > 0 ? 'QARZDOR' : 'TOLANGAN'}
                          className="shadow-none"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="mb-1">
                          <Badge variant="danger" className="shadow-none">
                            {row.qarzOylarSoni} {t('ta')}
                          </Badge>
                        </p>
                        <MonthChips items={(row.qarzOylar || []).map((key) => formatMonthKey(key, locale))} />
                      </td>
                      <td className="px-3 py-2 font-semibold text-rose-700">
                        {formatMoney(row.jamiQarzSumma, locale, t)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="indigo" className="min-w-24" onClick={() => openPaymentHistory(row)}>
                            {t("To'lov")}
                          </Button>
                          <Button size="sm" variant="secondary" className="min-w-20" onClick={() => openModal(row)}>
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

      <Modal
        open={paymentModalOpen}
        onClose={closePaymentModal}
        title={t("Student to'lovini belgilash")}
        maxWidth="max-w-5xl"
      >
        {!paymentStudent ? (
          <StateView type="empty" description={t("O'quvchi tanlanmagan.")} />
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm shadow-sm ring-1 ring-slate-200/50">
              <p className="font-semibold text-slate-900">{paymentStudent.fullName}</p>
              <p className="mt-1 text-slate-600">
                {t('Qarzdor oylar')}: {paymentStudent.qarzOylarSoni || 0} {t('ta')}
              </p>
              <div className="mt-2">
                <MonthChips items={(paymentStudent.qarzOylar || []).map((key) => formatMonthKey(key, locale))} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 ring-1 ring-slate-200/50">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={paymentModalTab === 'payment' ? 'indigo' : 'secondary'}
                  onClick={() => setPaymentModalTab('payment')}
                >
                  {t("To'lov")}
                </Button>
                <Button
                  size="sm"
                  variant={paymentModalTab === 'imtiyoz' ? 'indigo' : 'secondary'}
                  onClick={() => setPaymentModalTab('imtiyoz')}
                >
                  {t('Imtiyoz')}
                  {!!paymentState.imtiyozlar?.length && ` (${paymentState.imtiyozlar.length})`}
                </Button>
                <Button
                  size="sm"
                  variant={paymentModalTab === 'history' ? 'indigo' : 'secondary'}
                  onClick={() => setPaymentModalTab('history')}
                >
                  {t('Tarix')}
                  {!!paymentState.transactions?.length && ` (${paymentState.transactions.length})`}
                </Button>
              </div>
            </div>

            {paymentModalTab === 'payment' && (
              <div className="space-y-4">
                <form
                  onSubmit={handleSubmitPayment}
                  className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 md:grid-cols-2"
                >
                  <div>
                    <p className={fieldLabelClass}>{t("To'lov turi")}</p>
                    <Select
                      value={paymentForm.turi}
                      onChange={(e) =>
                        setPaymentForm((p) => {
                          const nextType = e.target.value;
                          if (nextType === 'YILLIK') return { ...p, turi: nextType, oylarSoni: 12 };
                          return { ...p, turi: nextType, oylarSoni: p.oylarSoni || 1 };
                        })
                      }
                    >
                      <option value="OYLIK">{t('Oylik')}</option>
                      <option value="YILLIK">{t('Yillik')}</option>
                      <option value="IXTIYORIY">{t('Ixtiyoriy')}</option>
                    </Select>
                  </div>
                  <div>
                    <p className={fieldLabelClass}>{t('Boshlanish oyi')}</p>
                    <Input
                      type="date"
                      value={monthKeyToDateInputValue(paymentForm.startMonth)}
                      onChange={(e) =>
                        setPaymentForm((p) => ({ ...p, startMonth: dateInputValueToMonthKey(e.target.value) }))
                      }
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      {t('Tanlangan oy')}: {formatMonthKey(paymentForm.startMonth, locale)}
                    </p>
                  </div>
                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t('Tez amal')}</p>
                      <p className="text-xs text-slate-500">
                        {Number(paymentStudent.qarzOylarSoni || 0) > 0
                          ? `${t('Qarzdor oylar')}: ${paymentStudent.qarzOylarSoni} ${t('ta')} (${formatMonthKey(firstDebtMonth(paymentStudent), locale)}dan boshlab)`
                          : t("Qarzdor oylar topilmadi")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="indigo"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={fillAllDebtIntoPaymentForm}
                      disabled={paymentActionLoading || Number(paymentStudent.qarzOylarSoni || 0) < 1}
                    >
                      {t("Barchasini to'lash")}
                    </Button>
                  </div>
                  <div>
                    <p className={fieldLabelClass}>{t('Oylar soni')}</p>
                    <Input
                      type="number"
                      min={1}
                      value={paymentForm.oylarSoni}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, oylarSoni: e.target.value }))}
                      disabled={paymentForm.turi === 'YILLIK'}
                    />
                  </div>
                  <div>
                    <p className={fieldLabelClass}>
                      {paymentForm.turi === 'IXTIYORIY'
                        ? t("Yuboriladigan summa (majburiy)")
                        : t("Yuboriladigan summa (ixtiyoriy)")}
                    </p>
                    <Input
                      type="number"
                      min={1}
                      value={paymentForm.summa}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, summa: e.target.value }))}
                      placeholder={
                        paymentForm.turi === 'IXTIYORIY'
                          ? t("Ixtiyoriy to'lovda summa kiriting")
                          : t("Bo'sh qoldirilsa auto hisoblanadi")
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <p className={fieldLabelClass}>{t('Izoh')}</p>
                    <Textarea
                      rows={2}
                      value={paymentForm.izoh}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, izoh: e.target.value }))}
                      placeholder={t('Izoh (ixtiyoriy)')}
                    />
                  </div>
                  <div className="md:col-span-2 flex flex-col justify-end gap-2 border-t border-slate-200/80 pt-2 sm:flex-row">
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={closePaymentModal}>
                      {t('Yopish')}
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      className="w-full sm:w-auto"
                      disabled={
                        paymentActionLoading ||
                        paymentState.loading ||
                        !mergedPaymentPreview?.valid ||
                        !mergedPaymentPreview?.previewMonthsCount
                      }
                    >
                      {t("To'lovni saqlash")}
                    </Button>
                  </div>
                </form>

                <Card title={t("To'lov preview")}>
                  {!mergedPaymentPreview ? (
                    <StateView
                      type={paymentState.loading ? 'loading' : 'empty'}
                      description={paymentState.loading ? t("To'lov ma'lumotlari olinmoqda") : t('Preview mavjud emas')}
                    />
                  ) : (
                    <div className="space-y-2 text-sm">
                      {serverPreviewState.loading && (
                        <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
                          {t('Server preview hisoblanmoqda...')}
                        </p>
                      )}
                      {!serverPreviewState.loading && serverPreviewState.error && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                          {t('Server preview xabari')}: {serverPreviewState.error}
                        </p>
                      )}
                      {!!mergedPaymentPreview.alreadyPaidMonthsFormatted?.length && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
                          {t("Tanlangan oylarning bir qismi oldin qoplangan")}: {mergedPaymentPreview.alreadyPaidMonthsFormatted.join(', ')}
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 md:grid-cols-2">
                        <p>{t("To'lov turi")}: <b>{paymentTypeLabel(paymentForm.turi)}</b></p>
                        <p>{t('Yopiladigan oylar soni')}: <b>{mergedPaymentPreview.previewMonthsCount || 0}</b></p>
                        <p>{t('Kutilgan summa')}: <b>{formatMoney(mergedPaymentPreview.expectedSumma || 0, locale, t)}</b></p>
                        <p>{t('Yuboriladigan summa')}: <b>{formatMoney(mergedPaymentPreview.finalSumma || 0, locale, t)}</b></p>
                      </div>
                      <div>
                        <p className="mb-1 text-slate-600">{t("Yopilishi rejalangan oylar")}:</p>
                        <MonthChips items={(mergedPaymentPreview.monthsToClose || []).map((key) => formatMonthKey(key, locale))} />
                      </div>
                      <div>
                        <p className="mb-1 text-slate-600">{t("Qarzdan yopiladigan oylar")}:</p>
                        <MonthChips items={(mergedPaymentPreview.debtClosingMonths || []).map((key) => formatMonthKey(key, locale))} />
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {paymentModalTab === 'imtiyoz' && (
              <div className="space-y-4">
                <Card title={t('Imtiyoz berish')}>
                  <form
                    onSubmit={handleCreateImtiyoz}
                    className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 lg:grid-cols-3"
                  >
                    <div>
                      <p className={fieldLabelClass}>{t('Imtiyoz turi')}</p>
                      <Select
                        value={imtiyozForm.turi}
                        onChange={(e) =>
                          setImtiyozForm((p) => ({
                            ...p,
                            turi: e.target.value,
                            qiymat: e.target.value === 'TOLIQ_OZOD' ? '' : p.qiymat,
                          }))
                        }
                      >
                        <option value="FOIZ">{t('Foiz')}</option>
                        <option value="SUMMA">{t('Summa')}</option>
                        <option value="TOLIQ_OZOD">{t("To'liq ozod")}</option>
                      </Select>
                    </div>
                    <div>
                      <p className={fieldLabelClass}>{t('Boshlanish oyi')}</p>
                      <Input
                        type="date"
                        value={monthKeyToDateInputValue(imtiyozForm.boshlanishOy)}
                        onChange={(e) =>
                          setImtiyozForm((p) => ({ ...p, boshlanishOy: dateInputValueToMonthKey(e.target.value) }))
                        }
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {t('Tanlangan oy')}: {formatMonthKey(imtiyozForm.boshlanishOy, locale)}
                      </p>
                    </div>
                    <div>
                      <p className={fieldLabelClass}>{t('Necha oyga')}</p>
                      <Input
                        type="number"
                        min={1}
                        value={imtiyozForm.oylarSoni}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, oylarSoni: e.target.value }))}
                      />
                    </div>
                    {imtiyozForm.turi !== 'TOLIQ_OZOD' && (
                      <div>
                        <p className={fieldLabelClass}>
                          {imtiyozForm.turi === 'FOIZ' ? t('Foiz qiymati') : t('Chegirma summasi')}
                        </p>
                        <Input
                          type="number"
                          min={1}
                          value={imtiyozForm.qiymat}
                          onChange={(e) => setImtiyozForm((p) => ({ ...p, qiymat: e.target.value }))}
                          required
                        />
                      </div>
                    )}
                    <div className={imtiyozForm.turi === 'TOLIQ_OZOD' ? 'lg:col-span-2' : ''}>
                      <p className={fieldLabelClass}>{t('Sabab')}</p>
                      <Input
                        type="text"
                        value={imtiyozForm.sabab}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, sabab: e.target.value }))}
                        placeholder={t('Masalan: yutuq, ijtimoiy holat')}
                        required
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <p className={fieldLabelClass}>{t('Izoh (ixtiyoriy)')}</p>
                      <Textarea
                        rows={2}
                        value={imtiyozForm.izoh}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, izoh: e.target.value }))}
                        placeholder={t('Izoh (ixtiyoriy)')}
                      />
                    </div>
                    <div className="lg:col-span-3 flex justify-end border-t border-slate-200/80 pt-2">
                      <Button type="submit" variant="indigo" disabled={paymentActionLoading}>
                        {t('Imtiyozni saqlash')}
                      </Button>
                    </div>
                  </form>
                </Card>

                <Card title={t('Berilgan imtiyozlar')}>
                  {!paymentState.imtiyozlar?.length ? (
                    <StateView type="empty" description={t("Imtiyozlar yo'q")} />
                  ) : (
                    <div className="space-y-2">
                      {paymentState.imtiyozlar.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {imtiyozTypeLabel(item.turi)}
                              {item.turi === 'FOIZ' && ` (${item.qiymat}%)`}
                              {item.turi === 'SUMMA' && ` (${formatMoney(item.qiymat, locale, t)})`}
                            </p>
                            <p className="text-xs text-slate-600">
                              {item.davrLabel || '-'} {item.sabab ? `| ${item.sabab}` : ''}
                            </p>
                          </div>
                          {item.isActive ? (
                            <Button
                              size="sm"
                              variant="danger"
                              className="min-w-24"
                              onClick={() => handleDeactivateImtiyoz(item.id)}
                              disabled={paymentActionLoading}
                            >
                              {t('Bekor qilish')}
                            </Button>
                          ) : (
                            <Badge variant="secondary">{t('Bekor qilingan')}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {paymentModalTab === 'history' && (
              <div className="space-y-4">
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
                      <table className="w-full min-w-[920px] text-sm">
                        <thead className="bg-slate-100 text-left text-slate-600">
                          <tr>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Sana')}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Turi')}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Holat')}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Summa')}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Qoplangan oylar')}</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">{t('Amal')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentState.transactions.map((tx) => (
                            <tr key={tx.id} className="border-t border-slate-100 bg-white hover:bg-slate-50/60">
                              <td className="px-3 py-2">{formatDateTime(tx.tolovSana, locale)}</td>
                              <td className="px-3 py-2">{t(tx.turi, { defaultValue: tx.turi })}</td>
                              <td className="px-3 py-2">
                                <StatusBadge domain="financeTransaction" value={tx.holat} className="shadow-none" />
                              </td>
                              <td className="px-3 py-2 font-semibold text-slate-900">{formatMoney(tx.summa, locale, t)}</td>
                              <td className="px-3 py-2">
                                {(tx.qoplanganOylarFormatted || []).join(', ') || '-'}
                              </td>
                              <td className="px-3 py-2">
                                {tx.holat === 'BEKOR_QILINGAN' ? (
                                  <Badge variant="secondary">{t('Bekor qilingan')}</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => handleRevertPayment(tx.id)}
                                    disabled={paymentActionLoading}
                                  >
                                    {t('Bekor qilish')}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card title={t('Amallar tarixi (ledger)')}>
                  {(!paymentState.transactions?.length && !paymentState.imtiyozlar?.length) ? (
                    <StateView type="empty" description={t("Tarix yozuvlari yo'q")} />
                  ) : (
                    <div className="space-y-2">
                      {[...(paymentState.transactions || []).map((tx) => ({ kind: 'PAYMENT', tx })), ...(paymentState.imtiyozlar || []).map((im) => ({ kind: 'IMTIYOZ', im }))].map((row, idx) => (
                        <div key={`${row.kind}-${row.kind === 'PAYMENT' ? row.tx.id : row.im.id}-${idx}`} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                          {row.kind === 'PAYMENT' ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="success">{t("To'lov")}</Badge>
                                <StatusBadge domain="financeTransaction" value={row.tx.holat} className="shadow-none" />
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {paymentTypeLabel(row.tx.turi)} • {formatMoney(row.tx.summa, locale, t)}
                              </p>
                              <p className="text-xs text-slate-600">{formatDateTime(row.tx.tolovSana, locale)}</p>
                              {!!row.tx.qoplanganOylar?.length && (
                                <MonthChips items={row.tx.qoplanganOylar.map((key) => formatMonthKey(key, locale))} />
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="info">{t('Imtiyoz')}</Badge>
                                {row.im.isActive ? (
                                  <Badge variant="success">{t('Aktiv')}</Badge>
                                ) : (
                                  <Badge variant="danger">{t('Bekor qilingan')}</Badge>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {imtiyozTypeLabel(row.im.turi)}
                                {row.im.turi === 'FOIZ' && ` (${row.im.qiymat}%)`}
                                {row.im.turi === 'SUMMA' && ` (${formatMoney(row.im.qiymat, locale, t)})`}
                              </p>
                              <p className="text-xs text-slate-600">{row.im.davrLabel || '-'}</p>
                              {row.im.sabab ? <p className="text-xs text-slate-600">{t('Sabab')}: {row.im.sabab}</p> : null}
                              {Array.isArray(row.im.oylarSnapshot) && row.im.oylarSnapshot.length ? (
                                <MonthChips
                                  items={row.im.oylarSnapshot
                                    .map((item) =>
                                      item && Number.isFinite(Number(item.yil)) && Number.isFinite(Number(item.oy))
                                        ? `${item.yil}-${String(item.oy).padStart(2, '0')}`
                                        : null,
                                    )
                                    .filter(Boolean)
                                    .map((key) => formatMonthKey(key, locale))}
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}
      </Modal>
      </div>
  );
}
