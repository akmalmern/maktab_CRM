import { buildMonthRange, currentMonthKey } from './financeSharedModel';

export function buildBasePaymentPreview({
  detailStudent,
  paymentForm,
  oylikTarif = 0,
  includePrepayment = false,
}) {
  if (!detailStudent) return null;

  const detailDebtMonths = Array.isArray(detailStudent.qarzOylar) ? detailStudent.qarzOylar : [];
  const debtAmountMap = new Map(
    (detailStudent?.qarzOylarDetal || []).map((item) => [item.key, Number(item.oySumma || 0)]),
  );
  const detailDebtCount = Number(detailStudent.qarzOylarSoni || 0);
  const detailDebtAmount = Number(detailStudent.jamiQarzSumma || 0);
  const startMonth = paymentForm?.startMonth || currentMonthKey();
  const currentOylikTarif = Number(oylikTarif || 0);

  const monthsToClose =
    paymentForm?.turi === 'YILLIK'
      ? buildMonthRange(startMonth, 12)
      : buildMonthRange(startMonth, Number(paymentForm?.oylarSoni || 1));

  const debtClosingMonths = monthsToClose.filter((key) => debtAmountMap.has(key));
  const prepaymentMonths = includePrepayment
    ? monthsToClose.filter((key) => !debtAmountMap.has(key))
    : [];
  const debtExpectedSumma = debtClosingMonths.reduce(
    (acc, key) => acc + Number(debtAmountMap.get(key) || 0),
    0,
  );
  const prepaymentExpectedSumma = prepaymentMonths.length * Math.max(currentOylikTarif, 0);
  const expectedSumma = debtExpectedSumma + prepaymentExpectedSumma;
  const previewMonthsCount = monthsToClose.length;
  const firstMonth = monthsToClose[0] || null;
  const lastMonth = monthsToClose[monthsToClose.length - 1] || null;
  const enteredSumma = Number(paymentForm?.summa || 0);
  const requireManualSumma = paymentForm?.turi === 'IXTIYORIY';
  const hasEnteredSumma = enteredSumma > 0;
  const finalSumma = hasEnteredSumma ? enteredSumma : expectedSumma;
  const hasAnyDebtMonth = debtClosingMonths.length > 0;
  const hasAnyPrepaymentMonth = prepaymentMonths.length > 0;
  const hasAnyPayableMonth =
    hasAnyDebtMonth || (hasAnyPrepaymentMonth && currentOylikTarif > 0);
  const exceedsExpectedSumma =
    hasEnteredSumma && hasAnyPayableMonth && enteredSumma > expectedSumma;
  const missingManualSumma = requireManualSumma && !hasEnteredSumma;
  const remainDebtCount = Math.max(detailDebtCount - debtClosingMonths.length, 0);
  const remainDebtAmount = Math.max(detailDebtAmount - debtExpectedSumma, 0);

  return {
    monthsToClose,
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
    hasAnyDebtMonth,
    hasAnyPrepaymentMonth,
    hasAnyPayableMonth,
    exceedsExpectedSumma,
    missingManualSumma,
    currentOylikTarif,
    requireManualSumma,
    hasEnteredSumma,
    enteredSumma,
    selectedDebtAmounts: debtClosingMonths.map((key) => ({
      key,
      amount: Number(debtAmountMap.get(key) || 0),
    })),
    detailDebtMonths,
  };
}

export function buildAdminPaymentPreview({ detailStudent, paymentForm, oylikTarif }) {
  const preview = buildBasePaymentPreview({
    detailStudent,
    paymentForm,
    oylikTarif,
    includePrepayment: true,
  });
  if (!preview) return null;

  const summaMatches = preview.requireManualSumma
    ? preview.hasEnteredSumma &&
      preview.hasAnyPayableMonth &&
      preview.enteredSumma <= preview.expectedSumma
    : !preview.hasEnteredSumma ||
      (preview.hasAnyPayableMonth && preview.enteredSumma <= preview.expectedSumma);
  const isPartialPayment =
    preview.hasEnteredSumma &&
    preview.hasAnyPayableMonth &&
    preview.enteredSumma < preview.expectedSumma;

  return {
    ...preview,
    actuallyClosing: preview.debtClosingMonths,
    valid: preview.hasAnyPayableMonth && summaMatches,
    summaMatches,
    isPartialPayment,
    usesEstimatedPrepayment: preview.hasAnyPrepaymentMonth,
  };
}

export function buildManagerPaymentPreview({ detailStudent, paymentForm }) {
  const preview = buildBasePaymentPreview({
    detailStudent,
    paymentForm,
    includePrepayment: false,
  });
  if (!preview) return null;

  return {
    ...preview,
    valid: preview.requireManualSumma
      ? preview.hasEnteredSumma
      : preview.expectedSumma > 0 || preview.hasEnteredSumma,
    alreadyPaidMonthsFormatted: [],
  };
}

export function mergePaymentPreviewWithServer(localPreview, serverPreview, options = {}) {
  if (!localPreview || !serverPreview) return localPreview;

  const appliedMonths = Array.isArray(serverPreview.appliedMonths)
    ? serverPreview.appliedMonths
    : [];
  const allocations = Array.isArray(serverPreview.allocations) ? serverPreview.allocations : [];
  const alreadyPaidMonths = Array.isArray(serverPreview.alreadyPaidMonths)
    ? serverPreview.alreadyPaidMonths
    : [];
  const alreadyPaidMonthsFormatted = Array.isArray(serverPreview.alreadyPaidMonthsFormatted)
    ? serverPreview.alreadyPaidMonthsFormatted
    : [];
  const requireLocalSummaMatches = options.requireLocalSummaMatches ?? true;
  const invalidateWhenAlreadyPaid = options.invalidateWhenAlreadyPaid ?? true;
  const includeTopLevelAlreadyPaidFormatted =
    options.includeTopLevelAlreadyPaidFormatted ?? false;

  const merged = {
    ...localPreview,
    monthsToClose:
      Array.isArray(serverPreview.monthsToClose) && serverPreview.monthsToClose.length
        ? serverPreview.monthsToClose
        : localPreview.monthsToClose,
    previewMonthsCount: Number(
      serverPreview.previewMonthsCount || localPreview.previewMonthsCount || 0,
    ),
    expectedSumma: Number(serverPreview.expectedSumma ?? localPreview.expectedSumma ?? 0),
    finalSumma: Number(serverPreview.finalSumma ?? localPreview.finalSumma ?? 0),
    actuallyClosing: appliedMonths.length ? appliedMonths : localPreview.actuallyClosing,
    debtClosingMonths: appliedMonths.length ? appliedMonths : localPreview.debtClosingMonths,
    isPartialPayment: Boolean(serverPreview.qismanTolov),
    selectedDebtAmounts: allocations.length
      ? allocations.map((row) => ({
          key: row.key,
          amount: Number(row.qoldiq ?? row.oyJami ?? 0),
        }))
      : localPreview.selectedDebtAmounts,
    serverPreview,
  };

  merged.valid =
    Boolean(serverPreview.canSubmit) &&
    (!invalidateWhenAlreadyPaid || alreadyPaidMonths.length === 0) &&
    (!requireLocalSummaMatches || Boolean(localPreview.summaMatches ?? true));

  if (includeTopLevelAlreadyPaidFormatted) {
    merged.alreadyPaidMonthsFormatted = alreadyPaidMonthsFormatted;
  }

  return merged;
}
