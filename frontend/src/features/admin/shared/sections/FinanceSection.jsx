import { useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Select, StateView, Textarea } from '../../../../components/ui';

function sumFormat(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

function todayMonth() {
  return new Date().toISOString().slice(0, 7);
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
        <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function statusBadge(holat) {
  if (holat === 'QARZDOR') {
    return <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Qarzdor</span>;
  }
  return <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">To'lagan</span>;
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
  onExportDebtors,
  exporting,
}) {
  const [activeTab, setActiveTab] = useState('payments');
  const [modalOpen, setModalOpen] = useState(false);
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

  const paymentPreview = useMemo(() => {
    if (!detailStudent) return null;
    const detailDebtMonths = detailStudent.qarzOylar || [];
    const debtAmountMap = new Map(
      (detailStudent?.qarzOylarDetal || []).map((item) => [item.key, Number(item.oySumma || 0)]),
    );
    const detailDebtCount = detailStudent.qarzOylarSoni || 0;
    const detailDebtAmount = Number(detailStudent.jamiQarzSumma || 0);
    const startMonth = paymentForm.startMonth || todayMonth();
    let monthsToClose = [];

    if (paymentForm.turi === 'YILLIK') {
      monthsToClose = buildMonthRange(startMonth, 12);
    } else {
      monthsToClose = buildMonthRange(startMonth, Number(paymentForm.oylarSoni || 1));
    }

    const actuallyClosing = monthsToClose.filter((key) => debtAmountMap.has(key));
    const expectedSumma = actuallyClosing.reduce((acc, key) => acc + Number(debtAmountMap.get(key) || 0), 0);
    const remainDebtCount = Math.max(detailDebtCount - actuallyClosing.length, 0);
    const remainDebtAmount = Math.max(detailDebtAmount - expectedSumma, 0);
    const previewMonthsCount = monthsToClose.length;
    const firstMonth = monthsToClose[0] || null;
    const lastMonth = monthsToClose[monthsToClose.length - 1] || null;
    const enteredSumma = Number(paymentForm.summa || 0);
    const requireManualSumma = paymentForm.turi === 'IXTIYORIY';
    const hasEnteredSumma = enteredSumma > 0;
    const finalSumma = hasEnteredSumma ? enteredSumma : expectedSumma;
    const hasAnyDebtMonth = actuallyClosing.length > 0;
    const summaMatches = requireManualSumma
      ? hasEnteredSumma && enteredSumma === expectedSumma
      : !hasEnteredSumma || enteredSumma === expectedSumma;

    return {
      monthsToClose,
      actuallyClosing,
      remainDebtCount,
      remainDebtAmount,
      previewMonthsCount,
      firstMonth,
      lastMonth,
      expectedSumma,
      finalSumma,
      valid: hasAnyDebtMonth && summaMatches,
      hasAnyDebtMonth,
      summaMatches,
      requireManualSumma,
      hasEnteredSumma,
      selectedDebtAmounts: actuallyClosing.map((key) => ({
        key,
        amount: Number(debtAmountMap.get(key) || 0),
      })),
      detailDebtMonths,
    };
  }, [detailStudent, paymentForm]);

  function openPaymentModal(studentId) {
    setSelectedStudentId(studentId);
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
    <div className="space-y-4">
      <Card
        title="Moliya bo'limi"
        actions={
          <div className="flex flex-wrap gap-2">
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
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-600">Oylik summa</p>
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
                <p className="mb-1 text-xs font-medium text-slate-600">Yillik summa</p>
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
              <p className="mb-1 text-xs font-medium text-slate-600">Ichki izoh (ixtiyoriy)</p>
              <Textarea
                rows={2}
                value={settingsDraft.izoh}
                onChange={(e) => setSettingsDraft((p) => ({ ...p, izoh: e.target.value }))}
                placeholder="Masalan: Kelasi oy uchun yangi tarif"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </form>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Joriy tarif: oylik {sumFormat(settings.oylikSumma)} so'm, yillik {sumFormat(settings.yillikSumma)} so'm.
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Studentlar soni</p>
              <p className="text-base font-semibold text-slate-900">
                {Number(settingsMeta?.preview?.studentCount || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Oylik taxminiy tushum</p>
              <p className="text-base font-semibold text-slate-900">
                {sumFormat(settingsMeta?.preview?.expectedMonthly || 0)} so'm
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Yillik taxminiy tushum</p>
              <p className="text-base font-semibold text-slate-900">
                {sumFormat(settingsMeta?.preview?.expectedYearly || 0)} so'm
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Bu oy to'langan</p>
              <p className="text-base font-semibold text-slate-900">
                {sumFormat(settingsMeta?.preview?.thisMonthPaidAmount || 0)} so'm
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs text-slate-500">Umumiy qarz</p>
              <p className="text-base font-semibold text-slate-900">
                {sumFormat(settingsMeta?.preview?.gapYearly || 0)} so'm
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card title="To'lovlar ro'yxati">
          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Oy kesimida real cashflow</p>
              <div className="flex items-center gap-2">
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
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Reja</p>
                <p className="text-base font-semibold text-slate-900">{sumFormat(cashflowPanel.planAmount)} so'm</p>
              </div>
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Tushum</p>
                <p className="text-base font-semibold text-emerald-700">{sumFormat(cashflowPanel.collectedAmount)} so'm</p>
              </div>
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Qarz</p>
                <p className="text-base font-semibold text-rose-700">{sumFormat(cashflowPanel.debtAmount)} so'm</p>
              </div>
              <div className="rounded border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Farq (Reja - Tushum)</p>
                <p className={`text-base font-semibold ${cashflowPanel.diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {sumFormat(Math.abs(cashflowPanel.diffAmount))} so'm
                  {cashflowPanel.diffAmount > 0 ? ' kam' : cashflowPanel.diffAmount < 0 ? ' ortiq' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
            {statusPanel.map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-base font-semibold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-6">
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
            <div className="flex gap-2">
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

          {studentsState.loading && <StateView type="loading" />}
          {studentsState.error && <StateView type="error" description={studentsState.error} />}
          {!studentsState.loading && !studentsState.error && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">F.I.SH</th>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Sinf</th>
                    <th className="px-3 py-2">Holat</th>
                    <th className="px-3 py-2">Qarz oylar</th>
                    <th className="px-3 py-2">Jami qarz</th>
                    <th className="px-3 py-2">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.fullName}</td>
                      <td className="px-3 py-2">{row.username}</td>
                      <td className="px-3 py-2">{row.classroom}</td>
                      <td className="px-3 py-2">{statusBadge(row.holat)}</td>
                      <td className="px-3 py-2">
                        <MonthChips months={row.qarzOylarFormatted || row.qarzOylar || []} />
                      </td>
                      <td className="px-3 py-2 font-semibold">{sumFormat(row.jamiQarzSumma)} so'm</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleQuickAction(row, 'ONE')}
                            disabled={actionLoading || row.holat !== 'QARZDOR'}
                          >
                            1 oy to'lash
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleQuickAction(row, 'ALL')}
                            disabled={actionLoading || row.holat !== 'QARZDOR'}
                          >
                            Qarzni yopish
                          </Button>
                          <Button size="sm" variant="indigo" onClick={() => openPaymentModal(row.id)}>
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
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
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

                <Card title="Imtiyoz berish">
                  <form onSubmit={handleCreateImtiyoz} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Imtiyoz turi</p>
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
                      <p className="mb-1 text-xs font-medium text-slate-600">Boshlanish oyi</p>
                      <Input
                        type="month"
                        value={imtiyozForm.boshlanishOy}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, boshlanishOy: e.target.value }))}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-600">Necha oyga</p>
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
                        <p className="mb-1 text-xs font-medium text-slate-600">
                          {imtiyozForm.turi === 'FOIZ' ? 'Foiz qiymati' : "Chegirma summasi"}
                        </p>
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
                    <div className={imtiyozForm.turi === 'TOLIQ_OZOD' ? 'md:col-span-2' : ''}>
                      <p className="mb-1 text-xs font-medium text-slate-600">Sabab</p>
                      <Input
                        type="text"
                        value={imtiyozForm.sabab}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, sabab: e.target.value }))}
                        placeholder="Masalan: yutuq, ijtimoiy holat"
                        required
                      />
                    </div>
                    <div className="md:col-span-3">
                      <p className="mb-1 text-xs font-medium text-slate-600">Izoh (ixtiyoriy)</p>
                      <Textarea
                        rows={2}
                        value={imtiyozForm.izoh}
                        onChange={(e) => setImtiyozForm((p) => ({ ...p, izoh: e.target.value }))}
                        placeholder="Izoh (ixtiyoriy)"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
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
                          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {imtiyozTypeLabel(item.turi)}
                                {item.turi === 'FOIZ' && ` (${item.qiymat}%)`}
                                {item.turi === 'SUMMA' && ` (${sumFormat(item.qiymat)} so'm)`}
                              </p>
                              <p className="text-xs text-slate-600">{item.davrLabel} | {item.sabab}</p>
                            </div>
                            {item.isActive ? (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDeactivateImtiyoz(item.id)}
                                disabled={actionLoading}
                              >
                                Bekor qilish
                              </Button>
                            ) : (
                              <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">Bekor qilingan</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <form onSubmit={handleCreatePayment} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-600">To'lov turi</p>
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
                    <p className="mb-1 text-xs font-medium text-slate-600">Boshlanish oyi</p>
                    <Input
                      type="month"
                      value={paymentForm.startMonth}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, startMonth: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-600">Oylar soni</p>
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
                    <p className="mb-1 text-xs font-medium text-slate-600">
                      {paymentForm.turi === 'IXTIYORIY'
                        ? "Yuboriladigan summa (majburiy)"
                        : "Yuboriladigan summa (ixtiyoriy)"}
                    </p>
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
                    <p className="mb-1 text-xs font-medium text-slate-600">Izoh</p>
                    <Textarea
                      rows={2}
                      value={paymentForm.izoh}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, izoh: e.target.value }))}
                      placeholder="Izoh (ixtiyoriy)"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                      Yopish
                    </Button>
                    <Button
                      type="submit"
                      variant="success"
                      disabled={actionLoading || !paymentPreview?.valid || !paymentPreview?.previewMonthsCount}
                    >
                      To'lovni saqlash
                    </Button>
                  </div>
                </form>

                <Card title="To'lov preview">
                  {!paymentPreview ? (
                    <StateView type="empty" description="Preview mavjud emas" />
                  ) : (
                    <div className="space-y-2 text-sm">
                      {!paymentPreview.hasAnyDebtMonth && (
                        <p className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                          Tanlangan davrda yopiladigan qarz oy topilmadi.
                        </p>
                      )}
                      {!paymentPreview.summaMatches && (
                        <p className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                          {paymentPreview.requireManualSumma && !paymentPreview.hasEnteredSumma
                            ? "Ixtiyoriy to'lovda summa majburiy."
                            : "Yuboriladigan summa kutilgan summa bilan bir xil bo'lishi kerak."}
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
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
                      </div>
                      <div>
                        <p className="mb-1 text-slate-600">Yopilishi rejalangan oylar:</p>
                        <MonthChips months={paymentPreview.monthsToClose.map(formatMonthKey)} maxVisible={6} />
                      </div>
                      <div>
                        <p className="mb-1 text-slate-600">Qarzdan yopiladigan oylar:</p>
                        <MonthChips months={paymentPreview.actuallyClosing.map(formatMonthKey)} maxVisible={6} />
                      </div>
                      {!!paymentPreview.selectedDebtAmounts?.length && (
                        <div>
                          <p className="mb-1 text-slate-600">Oylar kesimida summa:</p>
                          <div className="flex flex-wrap gap-1">
                            {paymentPreview.selectedDebtAmounts.map((item) => (
                              <span key={item.key} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
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
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
