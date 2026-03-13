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

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function buildFinancePaymentPreview({ detailStudent, paymentForm, oylikTarif }) {
  if (!detailStudent) return null;

  const detailDebtMonths = detailStudent.qarzOylar || [];
  const debtAmountMap = new Map(
    (detailStudent?.qarzOylarDetal || []).map((item) => [item.key, Number(item.oySumma || 0)]),
  );
  const detailDebtCount = detailStudent.qarzOylarSoni || 0;
  const detailDebtAmount = Number(detailStudent.jamiQarzSumma || 0);
  const startMonth = paymentForm.startMonth || currentMonthKey();
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

export function mergeServerPaymentPreview(localPreview, serverPreview) {
  if (!localPreview || !serverPreview) return localPreview;
  const appliedMonths = Array.isArray(serverPreview.appliedMonths) ? serverPreview.appliedMonths : [];
  const allocations = Array.isArray(serverPreview.allocations) ? serverPreview.allocations : [];
  const alreadyPaidMonths = Array.isArray(serverPreview.alreadyPaidMonths)
    ? serverPreview.alreadyPaidMonths
    : [];

  return {
    ...localPreview,
    monthsToClose:
      Array.isArray(serverPreview.monthsToClose) && serverPreview.monthsToClose.length
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

export function buildFinancePreviewFromLocalAndServer({
  detailStudent,
  paymentForm,
  oylikTarif,
  serverPreview,
}) {
  const localPreview = buildFinancePaymentPreview({
    detailStudent,
    paymentForm,
    oylikTarif,
  });
  return mergeServerPaymentPreview(localPreview, serverPreview);
}
