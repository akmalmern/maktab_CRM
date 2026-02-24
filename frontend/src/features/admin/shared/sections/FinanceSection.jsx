import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, Modal, Select, StateView, Textarea } from '../../../../components/ui';
import { usePreviewFinancePaymentMutation } from '../../../../services/api/financeApi';

function sumFormat(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

function todayMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function createClientRequestKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
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

const OY_NOMLARI = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const BILLING_MONTH_OPTIONS = [9, 10, 11, 12];
const SCHOOL_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

function formatMonthKey(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 2) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value;
  return `${OY_NOMLARI[month - 1]} ${year}`;
}

function normalizeBillingMonths(value, fallback = 10) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const intVal = Math.trunc(num);
  if (intVal < 1 || intVal > 12) return fallback;
  return intVal;
}

function sortSchoolMonths(months = []) {
  const monthSet = new Set(months.map((m) => Number(m)).filter((m) => Number.isFinite(m) && m >= 1 && m <= 12));
  return SCHOOL_MONTH_ORDER.filter((m) => monthSet.has(m));
}

function normalizeChargeableMonths(value, fallbackCount = 10) {
  const fromValue = Array.isArray(value) ? sortSchoolMonths(value) : [];
  if (fromValue.length) return fromValue;
  return SCHOOL_MONTH_ORDER.slice(0, normalizeBillingMonths(fallbackCount, 10));
}

function sameNumberArray(a = [], b = []) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (Number(a[i]) !== Number(b[i])) return false;
  }
  return true;
}

function deriveYearlySumma(oylikSumma, tolovOylarSoni = 10) {
  return Number(oylikSumma || 0) * normalizeBillingMonths(tolovOylarSoni);
}

function getCurrentAcademicYearLabel() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function isValidAcademicYearLabel(value) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

function buildAcademicYearOptions(classrooms = [], selectedAcademicYear) {
  const set = new Set();
  const current = getCurrentAcademicYearLabel();
  const [currentStart] = current.split('-').map(Number);
  [current, `${currentStart + 1}-${currentStart + 2}`, `${currentStart - 1}-${currentStart}`].forEach((v) => set.add(v));
  classrooms.forEach((c) => {
    if (isValidAcademicYearLabel(c?.academicYear)) set.add(c.academicYear);
  });
  if (isValidAcademicYearLabel(selectedAcademicYear)) set.add(selectedAcademicYear);
  return Array.from(set).sort((a, b) => b.localeCompare(a));
}

function monthKeyToDateInputValue(monthKey) {
  const [yearStr, monthStr] = String(monthKey || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const current = todayMonth();
    return `${current}-01`;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function dateInputValueToMonthKey(dateValue) {
  const [yearStr, monthStr] = String(dateValue || '').split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return todayMonth();
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function MonthChips({ months = [], maxVisible = 3 }) {
  if (!months.length) return <span className="text-slate-400">-</span>;
  const visible = months.slice(0, maxVisible);
  const hiddenCount = Math.max(0, months.length - maxVisible);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
        >
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function statusBadge(holat) {
  if (holat === 'QARZDOR') {
    return <Badge variant="danger">Qarzdor</Badge>;
  }
  return <Badge variant="success">To'lagan</Badge>;
}

function paymentTypeLabel(type) {
  if (type === 'YILLIK') return 'Yillik';
  if (type === 'IXTIYORIY') return 'Ixtiyoriy';
  return 'Oylik';
}

function imtiyozTypeLabel(type) {
  if (type === 'FOIZ') return 'Foiz';
  if (type === 'SUMMA') return "Summa";
  if (type === 'TOLIQ_OZOD') return "To'liq ozod";
  return type || '-';
}

function formatDateTimeUz(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('uz-UZ');
}

function FieldLabel({ children }) {
  return (
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

function MiniStatCard({ label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'border-slate-200 bg-white text-slate-900',
    info: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50/70 text-rose-900',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${toneClasses[tone] || toneClasses.default}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif }) {
  if (!detailStudent) return null;

  const detailDebtMonths = detailStudent.qarzOylar || [];
  const debtAmountMap = new Map(
    (detailStudent?.qarzOylarDetal || []).map((item) => [item.key, Number(item.oySumma || 0)]),
  );
  const detailDebtCount = detailStudent.qarzOylarSoni || 0;
  const detailDebtAmount = Number(detailStudent.jamiQarzSumma || 0);
  const startMonth = paymentForm.startMonth || todayMonth();
  const currentOylikTarif = Number(oylikTarif || 0);

  const monthsToClose =
    paymentForm.turi === 'YILLIK'
      ? buildMonthRange(startMonth, 12)
      : buildMonthRange(startMonth, Number(paymentForm.oylarSoni || 1));

  const debtClosingMonths = monthsToClose.filter((key) => debtAmountMap.has(key));
  const prepaymentMonths = monthsToClose.filter((key) => !debtAmountMap.has(key));
  const debtExpectedSumma = debtClosingMonths.reduce(
    (acc, key) => acc + Number(debtAmountMap.get(key) || 0),
    0,
  );
  const prepaymentExpectedSumma = prepaymentMonths.length * Math.max(currentOylikTarif, 0);
  const expectedSumma = debtExpectedSumma + prepaymentExpectedSumma;
  const remainDebtCount = Math.max(detailDebtCount - debtClosingMonths.length, 0);
  const remainDebtAmount = Math.max(detailDebtAmount - debtExpectedSumma, 0);
  const previewMonthsCount = monthsToClose.length;
  const firstMonth = monthsToClose[0] || null;
  const lastMonth = monthsToClose[monthsToClose.length - 1] || null;
  const enteredSumma = Number(paymentForm.summa || 0);
  const requireManualSumma = paymentForm.turi === 'IXTIYORIY';
  const hasEnteredSumma = enteredSumma > 0;
  const finalSumma = hasEnteredSumma ? enteredSumma : expectedSumma;
  const hasAnyDebtMonth = debtClosingMonths.length > 0;
  const hasAnyPrepaymentMonth = prepaymentMonths.length > 0;
  const hasAnyPayableMonth = hasAnyDebtMonth || (hasAnyPrepaymentMonth && currentOylikTarif > 0);
  const exceedsExpectedSumma = hasEnteredSumma && hasAnyPayableMonth && enteredSumma > expectedSumma;
  const missingManualSumma = requireManualSumma && !hasEnteredSumma;
  const summaMatches = requireManualSumma
    ? hasEnteredSumma && hasAnyPayableMonth && enteredSumma <= expectedSumma
    : !hasEnteredSumma || (hasAnyPayableMonth && enteredSumma <= expectedSumma);
  const isPartialPayment = hasEnteredSumma && hasAnyPayableMonth && enteredSumma < expectedSumma;

  return {
    monthsToClose,
    actuallyClosing: debtClosingMonths,
    debtClosingMonths,
    prepaymentMonths,
    remainDebtCount,
    remainDebtAmount,
    previewMonthsCount,
    firstMonth,
    lastMonth,
    expectedSumma,
    debtExpectedSumma,
    prepaymentExpectedSumma,
    finalSumma,
    valid: hasAnyPayableMonth && summaMatches,
    hasAnyDebtMonth,
    hasAnyPrepaymentMonth,
    hasAnyPayableMonth,
    summaMatches,
    exceedsExpectedSumma,
    missingManualSumma,
    isPartialPayment,
    usesEstimatedPrepayment: hasAnyPrepaymentMonth,
    currentOylikTarif,
    requireManualSumma,
    hasEnteredSumma,
    selectedDebtAmounts: debtClosingMonths.map((key) => ({
      key,
      amount: Number(debtAmountMap.get(key) || 0),
    })),
    detailDebtMonths,
  };
}

function useFinancePaymentPreview({ detailStudent, isSelectedDetailReady, paymentForm, oylikTarif }) {
  return useMemo(() => {
    if (!detailStudent || !isSelectedDetailReady) return null;
    return buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif });
  }, [detailStudent, isSelectedDetailReady, paymentForm, oylikTarif]);
}

function buildPaymentPayloadFromForm(paymentForm, paymentRequestKey) {
  const payload = {
    turi: paymentForm.turi,
    startMonth: paymentForm.startMonth,
    izoh: paymentForm.izoh || undefined,
  };
  payload.oylarSoni = paymentForm.turi === 'YILLIK' ? 12 : Number(paymentForm.oylarSoni || 1);
  if (paymentForm.summa !== '') payload.summa = Number(paymentForm.summa);
  if (paymentRequestKey) payload.idempotencyKey = paymentRequestKey;
  return payload;
}

function mergeServerPaymentPreview(localPreview, serverPreview) {
  if (!localPreview || !serverPreview) return localPreview;
  const appliedMonths = Array.isArray(serverPreview.appliedMonths) ? serverPreview.appliedMonths : [];
  const allocations = Array.isArray(serverPreview.allocations) ? serverPreview.allocations : [];
  const alreadyPaidMonths = Array.isArray(serverPreview.alreadyPaidMonths) ? serverPreview.alreadyPaidMonths : [];

  return {
    ...localPreview,
    monthsToClose: Array.isArray(serverPreview.monthsToClose) && serverPreview.monthsToClose.length
      ? serverPreview.monthsToClose
      : localPreview.monthsToClose,
    previewMonthsCount: Number(serverPreview.previewMonthsCount || localPreview.previewMonthsCount || 0),
    expectedSumma: Number(serverPreview.expectedSumma ?? localPreview.expectedSumma ?? 0),
    finalSumma: Number(serverPreview.finalSumma ?? localPreview.finalSumma ?? 0),
    actuallyClosing: appliedMonths.length ? appliedMonths : localPreview.actuallyClosing,
    debtClosingMonths: appliedMonths.length ? appliedMonths : localPreview.debtClosingMonths,
    isPartialPayment: Boolean(serverPreview.qismanTolov),
    valid:
      Boolean(serverPreview.canSubmit) &&
      alreadyPaidMonths.length === 0 &&
      Boolean(localPreview.summaMatches),
    selectedDebtAmounts: allocations.length
      ? allocations.map((row) => ({
          key: row.key,
          amount: Number(row.qoldiq ?? row.oyJami ?? 0),
        }))
      : localPreview.selectedDebtAmounts,
    serverPreview,
  };
}

function PaymentPreviewCard({
  paymentPreview,
  paymentForm,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  serverPreviewLoading,
  serverPreviewError,
}) {
  return (
    <Card title="To'lov preview">
      {!paymentPreview ? (
        <StateView
          type={detailState.loading || (selectedStudentId && !isSelectedDetailReady) ? 'loading' : 'empty'}
          description={
            detailState.loading || (selectedStudentId && !isSelectedDetailReady)
              ? "Student to'lov ma'lumoti yuklanmoqda"
              : 'Preview mavjud emas'
          }
        />
      ) : (
        <div className="space-y-2 text-sm">
          {!paymentPreview.hasAnyPayableMonth && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              Tanlangan davr bo'yicha to'lov hisoblab bo'lmadi (tarif yoki qarz ma'lumoti yetarli emas).
            </p>
          )}
          {paymentPreview.hasAnyPrepaymentMonth && (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">
              Tanlangan davrda qarz bo'lmagan oylar ham bor. Ular oldindan to'lov sifatida hisoblanadi
              {paymentPreview.currentOylikTarif > 0 ? ` (oylik tarif: ${sumFormat(paymentPreview.currentOylikTarif)} so'm)` : ''}.
            </p>
          )}
          {serverPreviewLoading && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              Server preview hisoblanmoqda...
            </p>
          )}
          {paymentPreview.serverPreview?.alreadyPaidMonths?.length > 0 && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              Tanlangan oylarning bir qismi oldin qoplangan: {paymentPreview.serverPreview.alreadyPaidMonthsFormatted?.join(', ')}
            </p>
          )}
          {!serverPreviewLoading && serverPreviewError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              Server preview xabari: {serverPreviewError}
            </p>
          )}
          {!paymentPreview.summaMatches && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">
              {paymentPreview.missingManualSumma
                ? "Ixtiyoriy to'lovda summa majburiy."
                : paymentPreview.exceedsExpectedSumma
                  ? "Yuboriladigan summa tanlangan qarz oylaridan katta bo'lmasligi kerak."
                  : "Yuboriladigan summa noto'g'ri kiritilgan."}
            </p>
          )}
          {paymentPreview.isPartialPayment && (
            <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700">
              Qisman to'lov: tanlangan qarz oylarining bir qismi yopiladi.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 md:grid-cols-2">
            <p className="text-slate-700">To'lov turi: <b>{paymentTypeLabel(paymentForm.turi)}</b></p>
            <p className="text-slate-700">Yopiladigan oylar soni: <b>{paymentPreview.previewMonthsCount}</b></p>
            <p className="text-slate-700 md:col-span-2">
              Davr:{' '}
              <b>
                {paymentPreview.firstMonth
                  ? `${formatMonthKey(paymentPreview.firstMonth)} - ${formatMonthKey(paymentPreview.lastMonth)}`
                  : '-'}
              </b>
            </p>
            <p className="text-slate-700">Kutilgan summa: <b>{sumFormat(paymentPreview.expectedSumma)} so'm</b></p>
            <p className="text-slate-700">Yuboriladigan summa: <b>{sumFormat(paymentPreview.finalSumma)} so'm</b></p>
            <p className="text-slate-700">
              Qarzdan yopiladigan summa: <b>{sumFormat(paymentPreview.debtExpectedSumma)} so'm</b>
            </p>
            <p className="text-slate-700">
              Oldindan to'lov (taxminiy): <b>{sumFormat(paymentPreview.prepaymentExpectedSumma)} so'm</b>
            </p>
          </div>
          <div>
            <p className="mb-1 text-slate-600">Yopilishi rejalangan oylar:</p>
            <MonthChips months={paymentPreview.monthsToClose.map(formatMonthKey)} maxVisible={6} />
          </div>
          <div>
            <p className="mb-1 text-slate-600">Qarzdan yopiladigan oylar:</p>
            <MonthChips months={paymentPreview.actuallyClosing.map(formatMonthKey)} maxVisible={6} />
          </div>
          <div>
            <p className="mb-1 text-slate-600">Oldindan to'lanadigan oylar:</p>
            <MonthChips months={paymentPreview.prepaymentMonths.map(formatMonthKey)} maxVisible={6} />
          </div>
          {!!paymentPreview.selectedDebtAmounts?.length && (
            <div>
              <p className="mb-1 text-slate-600">Oylar kesimida summa:</p>
              <div className="flex flex-wrap gap-1">
                {paymentPreview.selectedDebtAmounts.map((item) => (
                  <span
                    key={item.key}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
                  >
                    {formatMonthKey(item.key)}: {sumFormat(item.amount)} so'm
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-slate-700">
            Qoladigan qarz: <b>{paymentPreview.remainDebtCount}</b> oy / <b>{sumFormat(paymentPreview.remainDebtAmount)} so'm</b>
          </p>
        </div>
      )}
    </Card>
  );
}

function buildFinanceLedgerItems({ transactions = [], imtiyozlar = [] }) {
  const txItems = transactions.flatMap((tx) => {
    const base = {
      id: `tx-${tx.id}`,
      kind: 'PAYMENT',
      sortDate: tx.tolovSana || tx.createdAt || null,
      title: `${paymentTypeLabel(tx.turi)} to'lov`,
      amount: Number(tx.summa || 0),
      status: tx.holat === 'BEKOR_QILINGAN' ? 'BEKOR_QILINGAN' : 'AKTIV',
      months: tx.qoplanganOylarFormatted || tx.qoplanganOylar || [],
      allocations: tx.qoplamalar || [],
      note: tx.izoh || '',
      meta: tx,
    };
    if (tx.holat === 'BEKOR_QILINGAN') {
      return [
        base,
        {
          id: `tx-revert-${tx.id}`,
          kind: 'PAYMENT_REVERT',
          sortDate: tx.bekorSana || tx.updatedAt || tx.tolovSana || null,
          title: "To'lov bekor qilindi",
          amount: Number(tx.summa || 0),
          status: 'BEKOR_QILINGAN',
          months: tx.qoplanganOylarFormatted || tx.qoplanganOylar || [],
          allocations: tx.qoplamalar || [],
          note: tx.bekorIzoh || '',
          meta: tx,
        },
      ];
    }
    return [base];
  });

  const imtiyozItems = imtiyozlar.flatMap((item) => {
    const label =
      item.turi === 'FOIZ'
        ? `${imtiyozTypeLabel(item.turi)} (${item.qiymat}%)`
        : item.turi === 'SUMMA'
          ? `${imtiyozTypeLabel(item.turi)} (${sumFormat(item.qiymat)} so'm)`
          : imtiyozTypeLabel(item.turi);
    const base = {
      id: `imtiyoz-${item.id}`,
      kind: 'IMTIYOZ',
      sortDate: item.createdAt || null,
      title: `Imtiyoz: ${label}`,
      amount: Number(item.qiymat || 0),
      status: item.isActive ? 'AKTIV' : 'BEKOR_QILINGAN',
      months: item.oylarFormatted || [],
      allocations: [],
      note: item.izoh || '',
      reason: item.sabab || '',
      periodLabel: item.davrLabel || '',
      meta: item,
    };
    if (!item.isActive && item.bekorQilinganAt) {
      return [
        base,
        {
          id: `imtiyoz-revert-${item.id}`,
          kind: 'IMTIYOZ_REVERT',
          sortDate: item.bekorQilinganAt,
          title: "Imtiyoz bekor qilindi",
          amount: Number(item.qiymat || 0),
          status: 'BEKOR_QILINGAN',
          months: item.oylarFormatted || [],
          allocations: [],
          note: item.bekorQilishSababi || '',
          reason: item.sabab || '',
          periodLabel: item.davrLabel || '',
          meta: item,
        },
      ];
    }
    return [base];
  });

  return [...txItems, ...imtiyozItems].sort((a, b) => {
    const aTime = a.sortDate ? new Date(a.sortDate).getTime() : 0;
    const bTime = b.sortDate ? new Date(b.sortDate).getTime() : 0;
    return bTime - aTime;
  });
}

function ledgerKindBadge(item) {
  if (item.kind === 'PAYMENT') return <Badge variant="success">To'lov</Badge>;
  if (item.kind === 'PAYMENT_REVERT') return <Badge variant="danger">To'lov bekor</Badge>;
  if (item.kind === 'IMTIYOZ') return <Badge variant="info">Imtiyoz</Badge>;
  if (item.kind === 'IMTIYOZ_REVERT') return <Badge variant="danger">Imtiyoz bekor</Badge>;
  return <Badge>{item.kind}</Badge>;
}

function FinanceLedgerTimelineCard({ detailState, detailImtiyozlar, actionLoading, onRevertPayment }) {
  const items = useMemo(
    () =>
      buildFinanceLedgerItems({
        transactions: detailState.transactions || [],
        imtiyozlar: detailImtiyozlar || [],
      }),
    [detailState.transactions, detailImtiyozlar],
  );

  return (
    <Card title="Amallar tarixi (ledger)">
      {!items.length ? (
        <p className="text-sm text-slate-500">Tarix yozuvlari yo'q</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPayment = item.kind === 'PAYMENT';
            const tx = item.meta;
            return (
              <div key={item.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ledgerKindBadge(item)}
                      {item.status === 'AKTIV' ? (
                        <Badge variant="success">Aktiv</Badge>
                      ) : (
                        <Badge variant="danger">Bekor qilingan</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {item.title}
                      {item.kind.startsWith('PAYMENT') && ` • ${sumFormat(item.amount)} so'm`}
                    </p>
                    <p className="text-xs text-slate-600">{formatDateTimeUz(item.sortDate)}</p>
                    {item.periodLabel ? (
                      <p className="mt-1 text-xs text-slate-600">Davr: {item.periodLabel}</p>
                    ) : null}
                    {item.reason ? (
                      <p className="mt-1 text-xs text-slate-600">Sabab: {item.reason}</p>
                    ) : null}
                  </div>

                  {isPayment && (
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={actionLoading || tx?.holat === 'BEKOR_QILINGAN' || !onRevertPayment}
                      onClick={() => onRevertPayment?.(tx.id)}
                    >
                      Bekor qilish
                    </Button>
                  )}
                </div>

                {!!item.months?.length && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Oylar
                    </p>
                    <MonthChips months={item.months} maxVisible={8} />
                  </div>
                )}

                {!!item.allocations?.length && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                      Oylar kesimida summa
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {item.allocations.map((q) => (
                        <span
                          key={`${item.id}-${q.key || `${q.yil}-${q.oy}`}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                        >
                          {(q.oyLabel || formatMonthKey(q.key || `${q.yil}-${String(q.oy).padStart(2, '0')}`))}: {sumFormat(q.summa)} so'm
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.note ? (
                  <p className={`mt-2 text-xs ${item.status === 'BEKOR_QILINGAN' ? 'text-rose-600' : 'text-slate-600'}`}>
                    Izoh: {item.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ImtiyozFormCard({
  actionLoading,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  detailImtiyozlar,
  handleDeactivateImtiyoz,
}) {
  return (
    <Card title="Imtiyoz berish">
      <form
        onSubmit={handleCreateImtiyoz}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 lg:grid-cols-3"
      >
        <div>
          <FieldLabel>Imtiyoz turi</FieldLabel>
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
            <option value="FOIZ">Foiz</option>
            <option value="SUMMA">Summa</option>
            <option value="TOLIQ_OZOD">To'liq ozod</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Boshlanish oyi</FieldLabel>
          <Input
            type="date"
            value={monthKeyToDateInputValue(imtiyozForm.boshlanishOy)}
            onChange={(e) =>
              setImtiyozForm((p) => ({ ...p, boshlanishOy: dateInputValueToMonthKey(e.target.value) }))
            }
          />
          <p className="mt-1 text-xs text-slate-500">Tanlangan oy: {formatMonthKey(imtiyozForm.boshlanishOy)}</p>
        </div>
        <div>
          <FieldLabel>Necha oyga</FieldLabel>
          <Input
            type="number"
            min={1}
            value={imtiyozForm.oylarSoni}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, oylarSoni: e.target.value }))}
            placeholder="Oylar soni"
          />
        </div>
        {imtiyozForm.turi !== 'TOLIQ_OZOD' && (
          <div>
            <FieldLabel>{imtiyozForm.turi === 'FOIZ' ? 'Foiz qiymati' : "Chegirma summasi"}</FieldLabel>
            <Input
              type="number"
              min={1}
              value={imtiyozForm.qiymat}
              onChange={(e) => setImtiyozForm((p) => ({ ...p, qiymat: e.target.value }))}
              placeholder={imtiyozForm.turi === 'FOIZ' ? 'Foiz (1-99)' : "Summa (so'm)"}
              required
            />
          </div>
        )}
        <div className={imtiyozForm.turi === 'TOLIQ_OZOD' ? 'lg:col-span-2' : ''}>
          <FieldLabel>Sabab</FieldLabel>
          <Input
            type="text"
            value={imtiyozForm.sabab}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, sabab: e.target.value }))}
            placeholder="Masalan: yutuq, ijtimoiy holat"
            required
          />
        </div>
        <div className="lg:col-span-3">
          <FieldLabel>Izoh (ixtiyoriy)</FieldLabel>
          <Textarea
            rows={2}
            value={imtiyozForm.izoh}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, izoh: e.target.value }))}
            placeholder="Izoh (ixtiyoriy)"
          />
        </div>
        <div className="lg:col-span-3 flex justify-end border-t border-slate-200/80 pt-2">
          <Button type="submit" variant="indigo" disabled={actionLoading}>
            Imtiyozni saqlash
          </Button>
        </div>
      </form>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-semibold text-slate-700">Berilgan imtiyozlar</p>
        {!detailImtiyozlar.length ? (
          <p className="text-sm text-slate-500">Imtiyozlar yo'q</p>
        ) : (
          <div className="space-y-2">
            {detailImtiyozlar.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {imtiyozTypeLabel(item.turi)}
                    {item.turi === 'FOIZ' && ` (${item.qiymat}%)`}
                    {item.turi === 'SUMMA' && ` (${sumFormat(item.qiymat)} so'm)`}
                  </p>
                  <p className="text-xs text-slate-600">
                    {item.davrLabel} | {item.sabab}
                  </p>
                </div>
                {item.isActive ? (
                  <Button
                    size="sm"
                    variant="danger"
                    className="min-w-24"
                    onClick={() => handleDeactivateImtiyoz(item.id)}
                    disabled={actionLoading}
                  >
                    Bekor qilish
                  </Button>
                ) : (
                  <Badge>Bekor qilingan</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function PaymentFormCard({
  actionLoading,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  setModalOpen,
  paymentPreview,
  serverPreviewLoading,
  serverPreviewError,
}) {
  const detailStudent = isSelectedDetailReady ? detailState.student : null;
  const debtMonths = Array.isArray(detailStudent?.qarzOylar)
    ? detailStudent.qarzOylar.filter(Boolean).sort()
    : [];
  const allDebtStartMonth = debtMonths[0] || null;
  const allDebtMonthsCount = debtMonths.length;
  const canFillAllDebts = Boolean(allDebtStartMonth) && allDebtMonthsCount > 0;

  function handleFillAllDebts() {
    if (!canFillAllDebts) return;
    setPaymentForm((p) => ({
      ...p,
      turi: 'OYLIK',
      startMonth: allDebtStartMonth,
      oylarSoni: allDebtMonthsCount,
      summa: '',
    }));
  }

  return (
    <>
      <form
        onSubmit={handleCreatePayment}
        className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50 md:grid-cols-2"
      >
        <div>
          <FieldLabel>To'lov turi</FieldLabel>
          <Select
            value={paymentForm.turi}
            onChange={(e) =>
              setPaymentForm((p) => {
                const nextType = e.target.value;
                if (nextType === 'YILLIK') {
                  return { ...p, turi: nextType, oylarSoni: 12 };
                }
                return { ...p, turi: nextType, oylarSoni: p.oylarSoni || 1 };
              })
            }
          >
            <option value="OYLIK">Oylik</option>
            <option value="YILLIK">Yillik</option>
            <option value="IXTIYORIY">Ixtiyoriy</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Boshlanish oyi</FieldLabel>
          <Input
            type="date"
            value={monthKeyToDateInputValue(paymentForm.startMonth)}
            onChange={(e) => setPaymentForm((p) => ({ ...p, startMonth: dateInputValueToMonthKey(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-slate-500">Tanlangan oy: {formatMonthKey(paymentForm.startMonth)}</p>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">Tez amal</p>
            <p className="text-xs text-slate-500">
              {canFillAllDebts
                ? `Qarzdor oylar: ${allDebtMonthsCount} ta (${formatMonthKey(allDebtStartMonth)}dan boshlab)`
                : "Qarzdor oylar topilmadi"}
            </p>
          </div>
          <Button
            type="button"
            variant="indigo"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleFillAllDebts}
            disabled={actionLoading || detailState.loading || !isSelectedDetailReady || !canFillAllDebts}
          >
            Barchasini to'lash
          </Button>
        </div>
        <div>
          <FieldLabel>Oylar soni</FieldLabel>
          <Input
            type="number"
            min={1}
            value={paymentForm.oylarSoni}
            onChange={(e) => setPaymentForm((p) => ({ ...p, oylarSoni: e.target.value }))}
            placeholder="Oylar soni"
            disabled={paymentForm.turi === 'YILLIK'}
          />
        </div>
        <div>
          <FieldLabel>
            {paymentForm.turi === 'IXTIYORIY' ? "Yuboriladigan summa (majburiy)" : "Yuboriladigan summa (ixtiyoriy)"}
          </FieldLabel>
          <Input
            type="number"
            min={1}
            value={paymentForm.summa}
            onChange={(e) => setPaymentForm((p) => ({ ...p, summa: e.target.value }))}
            placeholder={
              paymentForm.turi === 'IXTIYORIY'
                ? "Ixtiyoriy to'lovda summa kiriting"
                : "Bo'sh qoldirilsa auto hisoblanadi"
            }
            required={paymentForm.turi === 'IXTIYORIY'}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Izoh</FieldLabel>
          <Textarea
            rows={2}
            value={paymentForm.izoh}
            onChange={(e) => setPaymentForm((p) => ({ ...p, izoh: e.target.value }))}
            placeholder="Izoh (ixtiyoriy)"
          />
        </div>
        <div className="md:col-span-2 flex flex-col justify-end gap-2 border-t border-slate-200/80 pt-2 sm:flex-row">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setModalOpen(false)}>
            Yopish
          </Button>
          <Button
            type="submit"
            variant="success"
            className="w-full sm:w-auto"
            disabled={
              actionLoading ||
              detailState.loading ||
              (Boolean(selectedStudentId) && !isSelectedDetailReady) ||
              !paymentPreview?.valid ||
              !paymentPreview?.previewMonthsCount
            }
          >
            To'lovni saqlash
          </Button>
        </div>
      </form>

      <PaymentPreviewCard
        paymentPreview={paymentPreview}
        paymentForm={paymentForm}
        detailState={detailState}
        selectedStudentId={selectedStudentId}
        isSelectedDetailReady={isSelectedDetailReady}
        serverPreviewLoading={serverPreviewLoading}
        serverPreviewError={serverPreviewError}
      />
    </>
  );
}

export default function FinanceSection({
  classrooms,
  settings,
  settingsMeta,
  studentsState,
  studentsSummary,
  detailState,
  query,
  actionLoading,
  onChangeQuery,
  onRefresh,
  onSaveSettings,
  onOpenDetail,
  onCreatePayment,
  onCreateImtiyoz,
  onDeactivateImtiyoz,
  onRollbackTarif,
  onRevertPayment,
  onExportDebtors,
  exporting,
}) {
  const [activeTab, setActiveTab] = useState('payments');
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalTab, setPaymentModalTab] = useState('payment');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentRequestKey, setPaymentRequestKey] = useState('');
  const [serverPaymentPreview, setServerPaymentPreview] = useState(null);
  const [previewFinancePayment, previewFinancePaymentState] = usePreviewFinancePaymentMutation();
  const [settingsDraft, setSettingsDraft] = useState({
    oylikSumma: '',
    billingAcademicYear: '',
    billingChargeableMonths: null,
    izoh: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    turi: 'OYLIK',
    startMonth: todayMonth(),
    oylarSoni: 1,
    summa: '',
    izoh: '',
  });
  const [imtiyozForm, setImtiyozForm] = useState({
    turi: 'FOIZ',
    qiymat: '',
    boshlanishOy: todayMonth(),
    oylarSoni: 1,
    sabab: '',
    izoh: '',
  });

  const students = useMemo(() => studentsState.items || [], [studentsState.items]);
  useEffect(() => {
    if (!query?.classroomId || query.classroomId !== 'all') return;
    const firstClassroomId = classrooms?.[0]?.id;
    if (!firstClassroomId) return;
    onChangeQuery({ classroomId: firstClassroomId, page: 1 });
  }, [query?.classroomId, classrooms, onChangeQuery]);
  const isClassroomSelected = query.classroomId && query.classroomId !== 'all';
  const detailStudent = detailState.student;
  const detailImtiyozlar = useMemo(() => detailState.imtiyozlar || [], [detailState.imtiyozlar]);
  const isSelectedDetailReady =
    Boolean(selectedStudentId) &&
    Boolean(detailStudent) &&
    String(detailStudent?.id) === String(selectedStudentId);

  const settingsValidation = useMemo(() => {
    const minSumma = Number(settingsMeta?.constraints?.minSumma || 50000);
    const maxSumma = Number(settingsMeta?.constraints?.maxSumma || 50000000);
    const currentBillingMonths = normalizeBillingMonths(
      settings?.tolovOylarSoni ?? Math.round(Number(settings?.yillikSumma || 0) / Math.max(Number(settings?.oylikSumma || 1), 1)),
      10,
    );
    const currentChargeableMonths = normalizeChargeableMonths(
      settings?.billingCalendar?.chargeableMonths,
      currentBillingMonths,
    );
    const currentAcademicYear = isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
      ? settings.billingCalendar.academicYear
      : getCurrentAcademicYearLabel();
    const oylik =
      settingsDraft.oylikSumma === '' ? Number(settings.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
    const billingAcademicYear = isValidAcademicYearLabel(settingsDraft.billingAcademicYear)
      ? settingsDraft.billingAcademicYear
      : currentAcademicYear;
    const billingChargeableMonths = Array.isArray(settingsDraft.billingChargeableMonths)
      ? normalizeChargeableMonths(settingsDraft.billingChargeableMonths, currentBillingMonths)
      : currentChargeableMonths;
    const tolovOylarSoni = billingChargeableMonths.length;
    const yillik = deriveYearlySumma(oylik, tolovOylarSoni);
    const errors = {};

    if (!Number.isFinite(oylik) || oylik < minSumma || oylik > maxSumma) {
      errors.oylikSumma = `Oylik summa ${sumFormat(minSumma)} - ${sumFormat(maxSumma)} oralig'ida bo'lishi kerak`;
    }
    if (!Number.isFinite(tolovOylarSoni) || tolovOylarSoni < 1 || tolovOylarSoni > 12) {
      errors.tolovOylarSoni = "To'lov olinadigan oylar soni 1-12 oralig'ida bo'lishi kerak";
    }
    if (!Number.isFinite(yillik) || yillik < minSumma || yillik > maxSumma) {
      errors.yillikSumma = `Yillik summa ${sumFormat(minSumma)} - ${sumFormat(maxSumma)} oralig'ida bo'lishi kerak`;
    }

    const changed =
      settingsDraft.oylikSumma !== '' ||
      (settingsDraft.billingAcademicYear !== '' && billingAcademicYear !== currentAcademicYear) ||
      (Array.isArray(settingsDraft.billingChargeableMonths) &&
        !sameNumberArray(billingChargeableMonths, currentChargeableMonths)) ||
      Boolean(settingsDraft.izoh);

    return {
      errors,
      valid: Object.keys(errors).length === 0,
      changed,
      computed: {
        oylik,
        yillik,
        tolovOylarSoni,
        billingAcademicYear,
        billingChargeableMonths,
        vacationMonths: SCHOOL_MONTH_ORDER.filter((month) => !billingChargeableMonths.includes(month)),
      },
    };
  }, [settingsDraft, settings, settingsMeta?.constraints]);

  const statusPanel = useMemo(() => {
    const totalRows = Number(studentsSummary?.totalRows || 0);
    const qarzdorlarSoni = Number(studentsSummary?.totalDebtors || 0);
    const jamiQarz = Number(studentsSummary?.totalDebtAmount || 0);
    const buOyTolangan = Number(studentsSummary?.thisMonthPaidAmount || 0);
    const buOyQarz = Number(studentsSummary?.thisMonthDebtAmount || 0);
    const tarifOylik = Number(studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0);
    const tarifYillik = Number(studentsSummary?.tarifYillikSumma || settings?.yillikSumma || 0);
    const tarifOylarSoni = normalizeBillingMonths(
      studentsSummary?.tarifTolovOylarSoni ?? settings?.tolovOylarSoni,
      10,
    );
    return [
      { label: "Jami o'quvchilar soni", value: totalRows },
      { label: "Qarzdor o'quvchilar soni", value: qarzdorlarSoni },
      { label: "Umumiy qarzdorlik summasi", value: sumFormat(jamiQarz) },
      { label: "Shu oy tushgan to'lovlar", value: `${sumFormat(buOyTolangan)} so'm` },
      { label: "Shu oy yopilmagan qarz", value: `${sumFormat(buOyQarz)} so'm` },
      { label: `Amaldagi tarif (oylik / yillik, ${tarifOylarSoni} oy)`, value: `${sumFormat(tarifOylik)} / ${sumFormat(tarifYillik)}` },
      { label: `Sahifa: ${studentsState.page}/${studentsState.pages || 1}`, value: `Yozuvlar: ${studentsState.limit || 20}` },
    ];
  }, [studentsSummary, studentsState.page, studentsState.pages, studentsState.limit, settings]);

  const billingAcademicYearOptions = useMemo(
    () => buildAcademicYearOptions(classrooms, settingsValidation.computed.billingAcademicYear),
    [classrooms, settingsValidation.computed.billingAcademicYear],
  );

  const cashflowPanel = useMemo(() => {
    const flow = studentsSummary?.cashflow || {};
    return {
      month: flow.monthFormatted || (flow.month ? formatMonthKey(flow.month) : formatMonthKey(todayMonth())),
      planAmount: Number(flow.planAmount || 0),
      collectedAmount: Number(flow.collectedAmount || 0),
      debtAmount: Number(flow.debtAmount || 0),
      diffAmount: Number(flow.diffAmount || 0),
    };
  }, [studentsSummary]);

  const localPaymentPreview = useFinancePaymentPreview({
    detailStudent,
    isSelectedDetailReady,
    paymentForm,
    oylikTarif: studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0,
  });
  const activeServerPaymentPreview =
    modalOpen && paymentModalTab === 'payment' && selectedStudentId && isSelectedDetailReady
      ? serverPaymentPreview
      : null;
  const paymentPreview = useMemo(
    () => mergeServerPaymentPreview(localPaymentPreview, activeServerPaymentPreview),
    [localPaymentPreview, activeServerPaymentPreview],
  );

  useEffect(() => {
    if (!modalOpen || paymentModalTab !== 'payment' || !selectedStudentId) return;
    if (!isSelectedDetailReady || !paymentForm.startMonth) return;

    const payload = buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const result = await previewFinancePayment({ studentId: selectedStudentId, payload }).unwrap();
        if (!cancelled) setServerPaymentPreview(result?.preview || null);
      } catch {
        if (!cancelled) setServerPaymentPreview(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    modalOpen,
    paymentModalTab,
    selectedStudentId,
    isSelectedDetailReady,
    paymentForm,
    paymentRequestKey,
    previewFinancePayment,
  ]);

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
    setPaymentModalTab('payment');
    setPaymentRequestKey(createClientRequestKey());
    setServerPaymentPreview(null);
    setPaymentForm({
      turi: 'OYLIK',
      startMonth: todayMonth(),
      oylarSoni: 1,
      summa: '',
      izoh: '',
    });
    setImtiyozForm({
      turi: 'FOIZ',
      qiymat: '',
      boshlanishOy: todayMonth(),
      oylarSoni: 1,
      sabab: '',
      izoh: '',
    });
    setModalOpen(true);
    onOpenDetail(studentId);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!settingsValidation.valid) return;

    const oylik =
      settingsDraft.oylikSumma === '' ? Number(settings.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
    const tolovOylarSoni = settingsValidation.computed.tolovOylarSoni;
    const yillik = settingsValidation.computed.yillik;

    const ok = await onSaveSettings({
      oylikSumma: oylik,
      yillikSumma: yillik,
      tolovOylarSoni,
      billingCalendar: {
        academicYear: settingsValidation.computed.billingAcademicYear,
        chargeableMonths: settingsValidation.computed.billingChargeableMonths,
      },
      boshlanishTuri: 'KELASI_OY',
      izoh: settingsDraft.izoh || undefined,
    });
    if (ok) {
      setSettingsDraft({ oylikSumma: '', billingAcademicYear: '', billingChargeableMonths: null, izoh: '' });
      onRefresh();
    }
  }

  function handleResetDraft() {
    setSettingsDraft({ oylikSumma: '', billingAcademicYear: '', billingChargeableMonths: null, izoh: '' });
  }

  function handleDefaultDraft() {
    const currentAcademicYear = isValidAcademicYearLabel(settings?.billingCalendar?.academicYear)
      ? settings.billingCalendar.academicYear
      : getCurrentAcademicYearLabel();
    setSettingsDraft({
      oylikSumma: '300000',
      billingAcademicYear: currentAcademicYear,
      billingChargeableMonths: SCHOOL_MONTH_ORDER.slice(0, 10),
      izoh: '',
    });
  }

  function toggleBillingMonth(month) {
    setSettingsDraft((prev) => {
      const currentBillingMonths = normalizeBillingMonths(settings?.tolovOylarSoni, 10);
      const currentMonths = Array.isArray(prev.billingChargeableMonths)
        ? prev.billingChargeableMonths
        : normalizeChargeableMonths(settings?.billingCalendar?.chargeableMonths, currentBillingMonths);
      const nextMonths = currentMonths.includes(month)
        ? currentMonths.filter((m) => m !== month)
        : [...currentMonths, month];
      return {
        ...prev,
        billingChargeableMonths: sortSchoolMonths(nextMonths),
      };
    });
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    const payload = buildPaymentPayloadFromForm(paymentForm, paymentRequestKey);

    const ok = await onCreatePayment(selectedStudentId, payload);
    if (ok) {
      setPaymentRequestKey(createClientRequestKey());
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  async function handleCreateImtiyoz(e) {
    e.preventDefault();
    const payload = {
      turi: imtiyozForm.turi,
      boshlanishOy: imtiyozForm.boshlanishOy,
      oylarSoni: Number(imtiyozForm.oylarSoni || 1),
      sabab: imtiyozForm.sabab,
      izoh: imtiyozForm.izoh || undefined,
    };
    if (imtiyozForm.turi !== 'TOLIQ_OZOD') {
      payload.qiymat = Number(imtiyozForm.qiymat || 0);
    }

    const ok = await onCreateImtiyoz(selectedStudentId, payload);
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  async function handleDeactivateImtiyoz(imtiyozId) {
    const ok = await onDeactivateImtiyoz(imtiyozId, { sabab: 'Admin tomonidan bekor qilindi' });
    if (ok) {
      await onOpenDetail(selectedStudentId);
      onRefresh();
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Moliya bo'limi"
        actions={
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-1">
            <Button
              size="sm"
              variant={activeTab === 'payments' ? 'indigo' : 'secondary'}
              onClick={() => setActiveTab('payments')}
            >
              To'lovlar
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'settings' ? 'indigo' : 'secondary'}
              onClick={() => setActiveTab('settings')}
            >
              Tarif sozlamalari
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">Bo'limni tanlang: To'lovlar yoki Tarif sozlamalari.</p>
      </Card>

      {activeTab === 'settings' && (
        <Card title="Tarif sozlamalari" subtitle="Oylik summa kiriting, yillik summa avtomatik hisoblanadi (to'lov oylar soni asosida).">
          <form
            onSubmit={handleSaveSettings}
            className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 ring-1 ring-slate-200/50"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Oylik summa</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={settingsDraft.oylikSumma || settings.oylikSumma || ''}
                  onChange={(e) => setSettingsDraft((p) => ({ ...p, oylikSumma: e.target.value }))}
                  placeholder="Oylik summa"
                />
                {settingsValidation.errors.oylikSumma && (
                  <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.oylikSumma}</p>
                )}
              </div>
              <div>
                <FieldLabel>To'lov olinadigan oylar soni</FieldLabel>
                <Input type="text" readOnly value={`${settingsValidation.computed.tolovOylarSoni} oy`} />
                <p className="mt-1 text-xs text-slate-500">
                  Oylar pastdagi billing calendar'dan tanlanadi. Tanlanmagan oylar ta'til deb olinadi.
                </p>
                {settingsValidation.errors.tolovOylarSoni && (
                  <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.tolovOylarSoni}</p>
                )}
              </div>
              <div>
                <FieldLabel>Yillik summa (avtomatik)</FieldLabel>
                <Input
                  type="text"
                  readOnly
                  value={settingsValidation.computed.yillik ? sumFormat(settingsValidation.computed.yillik) : ''}
                  placeholder="Yillik summa avtomatik chiqadi"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Formula: oylik summa × {settingsValidation.computed.tolovOylarSoni} oy
                </p>
                {settingsValidation.errors.yillikSumma && (
                  <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.yillikSumma}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <FieldLabel>Billing calendar (to'lov olinadigan oylar)</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(settingsMeta?.constraints?.billingMonthsOptions || BILLING_MONTH_OPTIONS).map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          billingChargeableMonths: SCHOOL_MONTH_ORDER.slice(0, months),
                        }))
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                    >
                      {months} oy preset
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <FieldLabel>Billing calendar o'quv yili</FieldLabel>
                  <Select
                    value={
                      isValidAcademicYearLabel(settingsDraft.billingAcademicYear)
                        ? settingsDraft.billingAcademicYear
                        : settingsValidation.computed.billingAcademicYear
                    }
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        billingAcademicYear: e.target.value,
                      }))
                    }
                  >
                    {billingAcademicYearOptions.map((academicYear) => (
                      <option key={academicYear} value={academicYear}>
                        {academicYear}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Ushbu calendar faqat tanlangan o'quv yilidagi qaysi oylar to'lovli / ta'til ekanini belgilaydi.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {SCHOOL_MONTH_ORDER.map((monthNo) => {
                  const selected = settingsValidation.computed.billingChargeableMonths.includes(monthNo);
                  return (
                    <button
                      key={monthNo}
                      type="button"
                      onClick={() => toggleBillingMonth(monthNo)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-800 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium">{OY_NOMLARI[monthNo - 1]}</div>
                      <div className="mt-1 text-xs text-slate-500">{selected ? "To'lov olinadi" : "Ta'til"}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  To'lov olinadigan oylar: {settingsValidation.computed.billingChargeableMonths.map((m) => OY_NOMLARI[m - 1]).join(', ') || '-'}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  Ta'til oylar: {settingsValidation.computed.vacationMonths.map((m) => OY_NOMLARI[m - 1]).join(', ') || '-'}
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Ichki izoh (ixtiyoriy)</FieldLabel>
              <Textarea
                rows={2}
                value={settingsDraft.izoh}
                onChange={(e) => setSettingsDraft((p) => ({ ...p, izoh: e.target.value }))}
                placeholder="Masalan: Kelasi oy uchun yangi tarif"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-2">
              <Button
                type="submit"
                variant="indigo"
                disabled={actionLoading || !settingsValidation.changed || !settingsValidation.valid}
              >
                {actionLoading ? 'Saqlanmoqda...' : 'Saqlash'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleResetDraft} disabled={actionLoading}>
                Bekor qilish
              </Button>
              <Button type="button" variant="secondary" onClick={handleDefaultDraft} disabled={actionLoading}>
                Default
              </Button>
              <span className="text-xs text-slate-500">
                {settingsValidation.changed ? "O'zgartirishlar tayyor" : "O'zgartirish yo'q"}
              </span>
            </div>
          </form>

          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/40">
            Joriy tarif: oylik {sumFormat(settings.oylikSumma)} so'm, yillik {sumFormat(settings.yillikSumma)} so'm ({normalizeBillingMonths(settings?.tolovOylarSoni, 10)} oy)
            {isValidAcademicYearLabel(settings?.billingCalendar?.academicYear) ? `, billing calendar: ${settings.billingCalendar.academicYear}` : ''}.
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
            <MiniStatCard label="Studentlar soni" value={Number(settingsMeta?.preview?.studentCount || 0)} tone="info" />
            <MiniStatCard
              label="Oylik taxminiy tushum"
              value={`${sumFormat(settingsMeta?.preview?.expectedMonthly || 0)} so'm`}
            />
            <MiniStatCard
              label="Yillik taxminiy tushum"
              value={`${sumFormat(settingsMeta?.preview?.expectedYearly || 0)} so'm`}
            />
            <MiniStatCard
              label="Bu oy to'langan"
              value={`${sumFormat(settingsMeta?.preview?.thisMonthPaidAmount || 0)} so'm`}
              tone="success"
            />
            <MiniStatCard
              label="Umumiy qarz"
              value={`${sumFormat(settingsMeta?.preview?.gapYearly || 0)} so'm`}
              tone="danger"
            />
          </div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card title="To'lovlar ro'yxati">
          <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold tracking-tight text-slate-800">Oylik pul oqimi (hisobot)</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
                <p className="text-xs text-slate-500">Qaysi oy bo'yicha hisobot</p>
                <Input
                  type="month"
                  value={query.cashflowMonth || ''}
                  onChange={(e) => onChangeQuery({ cashflowMonth: e.target.value || '' })}
                />
              </div>
            </div>
            <p className="mb-1 text-xs text-slate-600">Tanlangan hisobot oyi: {cashflowPanel.month}</p>
            <p className="mb-2 text-xs text-slate-500">
              Reja = kutilgan tushum, Tushum = amalda tushgan pul, Qarz = shu oy yopilmagan summa.
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <MiniStatCard label="Oylik reja (kutilgan tushum)" value={`${sumFormat(cashflowPanel.planAmount)} so'm`} />
              <MiniStatCard
                label="Amalda tushgan pul"
                value={`${sumFormat(cashflowPanel.collectedAmount)} so'm`}
                tone="success"
              />
              <MiniStatCard
                label="Shu oy qarz summasi"
                value={`${sumFormat(cashflowPanel.debtAmount)} so'm`}
                tone="danger"
              />
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Rejaga nisbatan farq</p>
                <p className={`mt-1 text-base font-semibold ${cashflowPanel.diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {sumFormat(Math.abs(cashflowPanel.diffAmount))} so'm
                  {cashflowPanel.diffAmount > 0
                    ? " kam tushgan"
                    : cashflowPanel.diffAmount < 0
                      ? " ko'p tushgan"
                      : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {statusPanel.slice(0, 4).map((card) => (
                <MiniStatCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
            {statusPanel.length > 4 && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 ring-1 ring-slate-200/40">
                <div className="mb-2 border-t border-slate-300/70 pt-2">
                  <p className="text-xs font-medium text-slate-600">
                    Quyidagi kartalar tanlangan sinf / ro'yxat ko'rinishiga bog'liq ma'lumotlar
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {statusPanel.slice(4).map((card) => (
                    <MiniStatCard key={card.label} label={card.label} value={card.value} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
              <Input
                type="text"
                value={query.search}
                onChange={(e) => onChangeQuery({ search: e.target.value, page: 1 })}
                placeholder="Ism yoki username..."
              />
              <Select
                value={query.status}
                onChange={(e) => onChangeQuery({ status: e.target.value, page: 1 })}
              >
                <option value="ALL">Hammasi</option>
                <option value="QARZDOR">Faqat qarzdor</option>
                <option value="TOLAGAN">Faqat to'lagan</option>
              </Select>
              <Select
                value={query.classroomId}
                onChange={(e) => onChangeQuery({ classroomId: e.target.value, page: 1 })}
              >
                <option value="all">Barcha sinflar</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </Select>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  onClick={() => onExportDebtors('xlsx')}
                  disabled={exporting === 'xlsx'}
                  className="w-full"
                >
                  Qarzdorlar Excel
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onExportDebtors('pdf')}
                  disabled={exporting === 'pdf'}
                  className="w-full"
                >
                  Qarzdorlar PDF
                </Button>
              </div>
            </div>
          </div>

          {!isClassroomSelected && (
            <StateView
              type="empty"
              description="Pastdagi jadvalni ko'rish uchun sinfni tanlang. Yuqoridagi umumiy statistika ko'rinishda qoladi."
            />
          )}
          {isClassroomSelected && studentsState.loading && <StateView type="loading" />}
          {isClassroomSelected && studentsState.error && <StateView type="error" description={studentsState.error} />}
          {isClassroomSelected && !studentsState.loading && !studentsState.error && (
            <>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1 lg:hidden">
                {students.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-200/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{row.fullName}</p>
                        <p className="text-xs text-slate-500">@{row.username}</p>
                        <p className="mt-1 text-xs text-slate-600">{row.classroom || '-'}</p>
                      </div>
                      {statusBadge(row.holat)}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                        <p className="text-xs text-slate-500">Qarz oylar</p>
                        <div className="mt-1">
                          <MonthChips months={row.qarzOylarFormatted || row.qarzOylar || []} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                        <p className="text-xs text-slate-500">Jami qarz</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {sumFormat(row.jamiQarzSumma)} so'm
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <Button
                        size="sm"
                        variant="indigo"
                        onClick={() => openPaymentModal(row.id)}
                        className="w-full"
                      >
                        To'lov
                      </Button>
                    </div>
                  </div>
                ))}
                {!students.length && (
                  <StateView type="empty" description="To'lov ma'lumoti topilmadi" />
                )}
              </div>

              <div className="hidden max-h-[60vh] overflow-auto rounded-xl border border-slate-200/80 ring-1 ring-slate-200/40 lg:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-100 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">F.I.SH</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Username</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Sinf</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Holat</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Qarz oylar</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Jami qarz</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.13em]">Amal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100 bg-white hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.fullName}</td>
                        <td className="px-3 py-2">{row.username}</td>
                        <td className="px-3 py-2">{row.classroom}</td>
                        <td className="px-3 py-2">{statusBadge(row.holat)}</td>
                        <td className="px-3 py-2">
                          <MonthChips months={row.qarzOylarFormatted || row.qarzOylar || []} />
                        </td>
                        <td className="px-3 py-2 font-semibold">{sumFormat(row.jamiQarzSumma)} so'm</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="indigo" className="min-w-20" onClick={() => openPaymentModal(row.id)}>
                              To'lov
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!students.length && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          To'lov ma'lumoti topilmadi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {isClassroomSelected && (
            <div className="mt-3 flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onChangeQuery({ page: Math.max(1, query.page - 1) })}
                disabled={query.page <= 1}
              >
                Oldingi
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onChangeQuery({ page: Math.min(studentsState.pages || 1, query.page + 1) })}
                disabled={query.page >= (studentsState.pages || 1)}
              >
                Keyingi
              </Button>
            </div>
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Student to'lovini belgilash" maxWidth="max-w-3xl">
        {!selectedStudentId ? (
          <StateView type="empty" description="Student tanlanmagan" />
        ) : (
          <div className="space-y-4">
            {detailState.loading ? (
              <StateView type="loading" />
            ) : detailState.error ? (
              <StateView type="error" description={detailState.error} />
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-sm ring-1 ring-slate-200/50">
              <p className="font-semibold text-slate-900">{detailStudent?.fullName || '-'}</p>
                  <p className="mt-1 text-slate-600">Qarzdor oylar: {detailStudent?.qarzOylarSoni || 0} ta</p>
                  <div className="mt-2">
                    <MonthChips
                      months={
                        detailStudent?.qarzOylarFormatted?.length
                          ? detailStudent.qarzOylarFormatted
                          : (detailStudent?.qarzOylar || []).map(formatMonthKey)
                      }
                      maxVisible={5}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 ring-1 ring-slate-200/50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant={paymentModalTab === 'payment' ? 'indigo' : 'secondary'}
                      onClick={() => setPaymentModalTab('payment')}
                    >
                      To'lov
                    </Button>
                    <Button
                      size="sm"
                      variant={paymentModalTab === 'imtiyoz' ? 'indigo' : 'secondary'}
                      onClick={() => setPaymentModalTab('imtiyoz')}
                    >
                      Imtiyoz
                      {!!detailImtiyozlar.length && ` (${detailImtiyozlar.length})`}
                    </Button>
                    <Button
                      size="sm"
                      variant={paymentModalTab === 'history' ? 'indigo' : 'secondary'}
                      onClick={() => setPaymentModalTab('history')}
                    >
                      Tarix
                      {!!detailState.transactions?.length && ` (${detailState.transactions.length})`}
                    </Button>
                  </div>
                </div>

                {paymentModalTab === 'payment' && (
                  <PaymentFormCard
                    actionLoading={actionLoading}
                    detailState={detailState}
                    selectedStudentId={selectedStudentId}
                    isSelectedDetailReady={isSelectedDetailReady}
                    paymentForm={paymentForm}
                    setPaymentForm={setPaymentForm}
                    handleCreatePayment={handleCreatePayment}
                    setModalOpen={setModalOpen}
                    paymentPreview={paymentPreview}
                    serverPreviewLoading={previewFinancePaymentState.isLoading}
                    serverPreviewError={previewFinancePaymentState.error?.message || null}
                  />
                )}

                {paymentModalTab === 'imtiyoz' && (
                  <ImtiyozFormCard
                    actionLoading={actionLoading}
                    imtiyozForm={imtiyozForm}
                    setImtiyozForm={setImtiyozForm}
                    handleCreateImtiyoz={handleCreateImtiyoz}
                    detailImtiyozlar={detailImtiyozlar}
                    handleDeactivateImtiyoz={handleDeactivateImtiyoz}
                  />
                )}

                {paymentModalTab === 'history' && !!settingsMeta?.tarifHistory?.length && (
                  <Card title="Tarif versiyalari">
                    <div className="space-y-2">
                      {settingsMeta.tarifHistory.slice(0, 5).map((tarif) => {
                        const isRollbackDisabled = actionLoading || !onRollbackTarif || tarif.holat === 'AKTIV';
                        return (
                          <div
                            key={tarif.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {sumFormat(tarif.oylikSumma)} / {sumFormat(tarif.yillikSumma)} so'm
                              </p>
                              <p className="text-xs text-slate-600">
                                {tarif.boshlanishSana ? new Date(tarif.boshlanishSana).toLocaleDateString('uz-UZ') : '-'} | {tarif.holat}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {tarif.holat === 'AKTIV' ? <Badge variant="success">Aktiv</Badge> : <Badge>{tarif.holat || '-'}</Badge>}
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isRollbackDisabled}
                                onClick={() => onRollbackTarif?.(tarif.id)}
                              >
                                Rollback
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {paymentModalTab === 'history' && (
                  <FinanceLedgerTimelineCard
                    detailState={detailState}
                    detailImtiyozlar={detailImtiyozlar}
                    actionLoading={actionLoading}
                    onRevertPayment={onRevertPayment}
                  />
                )}

              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
