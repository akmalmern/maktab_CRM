import { useMemo, useState } from 'react';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Badge, Button, Card, Input, Modal, Select, StateView, Textarea } from '../../../../components/ui';

function sumFormat(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

function todayMonth() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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

function formatMonthKey(value) {
  const parts = String(value || '').split('-');
  if (parts.length !== 2) return value;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return value;
  return `${OY_NOMLARI[month - 1]} ${year}`;
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

function PaymentPreviewCard({ paymentPreview, paymentForm, detailState, selectedStudentId, isSelectedDetailReady }) {
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
            type="month"
            value={imtiyozForm.boshlanishOy}
            onChange={(e) => setImtiyozForm((p) => ({ ...p, boshlanishOy: e.target.value }))}
          />
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
}) {
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
            type="month"
            value={paymentForm.startMonth}
            onChange={(e) => setPaymentForm((p) => ({ ...p, startMonth: e.target.value }))}
          />
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
  const [settingsDraft, setSettingsDraft] = useState({
    oylikSumma: '',
    yillikSumma: '',
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
  const detailStudent = detailState.student;
  const detailImtiyozlar = useMemo(() => detailState.imtiyozlar || [], [detailState.imtiyozlar]);
  const isSelectedDetailReady =
    Boolean(selectedStudentId) &&
    Boolean(detailStudent) &&
    String(detailStudent?.id) === String(selectedStudentId);

  const settingsValidation = useMemo(() => {
    const minSumma = Number(settingsMeta?.constraints?.minSumma || 50000);
    const maxSumma = Number(settingsMeta?.constraints?.maxSumma || 50000000);
    const oylik =
      settingsDraft.oylikSumma === '' ? Number(settings.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
    const yillik =
      settingsDraft.yillikSumma === '' ? Number(settings.yillikSumma || 0) : Number(settingsDraft.yillikSumma);
    const errors = {};

    if (!Number.isFinite(oylik) || oylik < minSumma || oylik > maxSumma) {
      errors.oylikSumma = `Oylik summa ${sumFormat(minSumma)} - ${sumFormat(maxSumma)} oralig'ida bo'lishi kerak`;
    }
    if (!Number.isFinite(yillik) || yillik < minSumma || yillik > maxSumma) {
      errors.yillikSumma = `Yillik summa ${sumFormat(minSumma)} - ${sumFormat(maxSumma)} oralig'ida bo'lishi kerak`;
    }
    if (Number.isFinite(oylik) && Number.isFinite(yillik) && yillik > oylik * 12) {
      errors.yillikSumma = "Yillik summa oylik * 12 dan katta bo'lmasligi kerak";
    }

    const changed =
      settingsDraft.oylikSumma !== '' ||
      settingsDraft.yillikSumma !== '' ||
      Boolean(settingsDraft.izoh);

    return {
      errors,
      valid: Object.keys(errors).length === 0,
      changed,
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
    return [
      { label: "Jami o'quvchi", value: totalRows },
      { label: 'Qarzdorlar', value: qarzdorlarSoni },
      { label: "Jami qarz (so'm)", value: sumFormat(jamiQarz) },
      { label: "Bu oy to'langan", value: `${sumFormat(buOyTolangan)} so'm` },
      { label: "Bu oy qarz bo'lib turgan", value: `${sumFormat(buOyQarz)} so'm` },
      { label: 'Tarif (oylik / yillik)', value: `${sumFormat(tarifOylik)} / ${sumFormat(tarifYillik)}` },
      { label: `Sahifa ${studentsState.page}/${studentsState.pages || 1}`, value: studentsState.limit || 20 },
    ];
  }, [studentsSummary, studentsState.page, studentsState.pages, studentsState.limit, settings]);

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

  const paymentPreview = useFinancePaymentPreview({
    detailStudent,
    isSelectedDetailReady,
    paymentForm,
    oylikTarif: studentsSummary?.tarifOylikSumma || settings?.oylikSumma || 0,
  });

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
    setPaymentModalTab('payment');
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

  function firstDebtMonth(row) {
    return row?.qarzOylar?.[0] || todayMonth();
  }

  async function handleQuickAction(row, mode) {
    if (!row || row.holat !== 'QARZDOR') return;
    const startMonth = firstDebtMonth(row);
    const payload =
      mode === 'ALL'
        ? { turi: 'OYLIK', startMonth, oylarSoni: Math.max(1, Number(row.qarzOylarSoni || 1)) }
        : { turi: 'OYLIK', startMonth, oylarSoni: 1 };

    const ok = await onCreatePayment(row.id, payload);
    if (ok) {
      if (selectedStudentId === row.id) {
        await onOpenDetail(row.id);
      }
      onRefresh();
    }
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    if (!settingsValidation.valid) return;

    const oylik =
      settingsDraft.oylikSumma === '' ? Number(settings.oylikSumma || 0) : Number(settingsDraft.oylikSumma);
    const yillik =
      settingsDraft.yillikSumma === '' ? Number(settings.yillikSumma || 0) : Number(settingsDraft.yillikSumma);

    const ok = await onSaveSettings({
      oylikSumma: oylik,
      yillikSumma: yillik,
      boshlanishTuri: 'KELASI_OY',
      izoh: settingsDraft.izoh || undefined,
    });
    if (ok) {
      setSettingsDraft({ oylikSumma: '', yillikSumma: '', izoh: '' });
      onRefresh();
    }
  }

  function handleResetDraft() {
    setSettingsDraft({ oylikSumma: '', yillikSumma: '', izoh: '' });
  }

  function handleDefaultDraft() {
    setSettingsDraft({
      oylikSumma: '300000',
      yillikSumma: '3000000',
      izoh: '',
    });
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    const payload = {
      turi: paymentForm.turi,
      startMonth: paymentForm.startMonth,
      izoh: paymentForm.izoh || undefined,
    };

    if (paymentForm.turi === 'YILLIK') {
      payload.oylarSoni = 12;
    } else {
      payload.oylarSoni = Number(paymentForm.oylarSoni || 1);
    }

    if (paymentForm.summa !== '') {
      payload.summa = Number(paymentForm.summa);
    }

    const ok = await onCreatePayment(selectedStudentId, payload);
    if (ok) {
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
    <AutoTranslate>
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
        <Card title="Tarif sozlamalari" subtitle="Faqat oylik va yillik narx bilan boshqaruv.">
          <form
            onSubmit={handleSaveSettings}
            className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 ring-1 ring-slate-200/50"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <FieldLabel>Yillik summa</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={settingsDraft.yillikSumma || settings.yillikSumma || ''}
                  onChange={(e) => setSettingsDraft((p) => ({ ...p, yillikSumma: e.target.value }))}
                  placeholder="Yillik summa"
                />
                {settingsValidation.errors.yillikSumma && (
                  <p className="mt-1 text-xs text-rose-600">{settingsValidation.errors.yillikSumma}</p>
                )}
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
            Joriy tarif: oylik {sumFormat(settings.oylikSumma)} so'm, yillik {sumFormat(settings.yillikSumma)} so'm.
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
              <p className="text-sm font-semibold tracking-tight text-slate-800">Oy kesimida real cashflow</p>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
                <p className="text-xs text-slate-500">Hisobot oyi</p>
                <Input
                  type="month"
                  value={query.cashflowMonth || ''}
                  onChange={(e) => onChangeQuery({ cashflowMonth: e.target.value || '' })}
                />
              </div>
            </div>
            <p className="mb-2 text-xs text-slate-600">Oy: {cashflowPanel.month}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <MiniStatCard label="Reja" value={`${sumFormat(cashflowPanel.planAmount)} so'm`} />
              <MiniStatCard
                label="Tushum"
                value={`${sumFormat(cashflowPanel.collectedAmount)} so'm`}
                tone="success"
              />
              <MiniStatCard
                label="Qarz"
                value={`${sumFormat(cashflowPanel.debtAmount)} so'm`}
                tone="danger"
              />
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <p className="text-xs text-slate-500">Farq (Reja - Tushum)</p>
                <p className={`mt-1 text-base font-semibold ${cashflowPanel.diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {sumFormat(Math.abs(cashflowPanel.diffAmount))} so'm
                  {cashflowPanel.diffAmount > 0 ? ' kam' : cashflowPanel.diffAmount < 0 ? ' ortiq' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {statusPanel.map((card) => (
              <MiniStatCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>

          <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
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
              <Select
                value={String(query.limit)}
                onChange={(e) => onChangeQuery({ limit: Number(e.target.value), page: 1 })}
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} ta / sahifa
                  </option>
                ))}
              </Select>
              <Button variant="secondary" onClick={onRefresh}>
                Yangilash
              </Button>
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

          {studentsState.loading && <StateView type="loading" />}
          {studentsState.error && <StateView type="error" description={studentsState.error} />}
          {!studentsState.loading && !studentsState.error && (
            <>
              <div className="space-y-3 lg:hidden">
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
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleQuickAction(row, 'ONE')}
                        disabled={actionLoading || row.holat !== 'QARZDOR'}
                        className="w-full"
                      >
                        1 oy to'lash
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleQuickAction(row, 'ALL')}
                        disabled={actionLoading || row.holat !== 'QARZDOR'}
                        className="w-full"
                      >
                        Qarzni yopish
                      </Button>
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

              <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 ring-1 ring-slate-200/40 lg:block">
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
                            <Button
                              size="sm"
                              variant="success"
                              className="min-w-24"
                              onClick={() => handleQuickAction(row, 'ONE')}
                              disabled={actionLoading || row.holat !== 'QARZDOR'}
                            >
                              1 oy to'lash
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="min-w-24"
                              onClick={() => handleQuickAction(row, 'ALL')}
                              disabled={actionLoading || row.holat !== 'QARZDOR'}
                            >
                              Qarzni yopish
                            </Button>
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
                  <Card title="To'lov tranzaksiyalari">
                  {!detailState.transactions?.length ? (
                    <p className="text-sm text-slate-500">Tranzaksiyalar yo'q</p>
                  ) : (
                    <div className="space-y-2">
                      {detailState.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {paymentTypeLabel(tx.turi)} • {sumFormat(tx.summa)} so'm
                              </p>
                              <p className="text-xs text-slate-600">
                                {tx.tolovSana ? new Date(tx.tolovSana).toLocaleString('uz-UZ') : '-'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {tx.holat === 'BEKOR_QILINGAN' ? (
                                <Badge variant="danger">Bekor qilingan</Badge>
                              ) : (
                                <Badge variant="success">Aktiv</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={actionLoading || tx.holat === 'BEKOR_QILINGAN' || !onRevertPayment}
                                onClick={() => onRevertPayment?.(tx.id)}
                              >
                                Bekor qilish
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                Qoplangan oylar
                              </p>
                              <MonthChips months={tx.qoplanganOylarFormatted || tx.qoplanganOylar || []} maxVisible={6} />
                            </div>
                            {!!tx.qoplamalar?.length && (
                              <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                  Oylar kesimida summa
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {tx.qoplamalar.map((q) => (
                                    <span
                                      key={`${tx.id}-${q.key}`}
                                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                                    >
                                      {(q.oyLabel || formatMonthKey(q.key))}: {sumFormat(q.summa)} so'm
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {tx.izoh ? <p className="mt-2 text-xs text-slate-600">Izoh: {tx.izoh}</p> : null}
                          {tx.bekorIzoh ? (
                            <p className="mt-1 text-xs text-rose-600">Bekor izoh: {tx.bekorIzoh}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
      </div>
    </AutoTranslate>
  );
}
