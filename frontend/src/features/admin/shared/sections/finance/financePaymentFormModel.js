export function deriveFinancePaymentDebtMonths(detailStudent) {
  return Array.isArray(detailStudent?.qarzOylar)
    ? detailStudent.qarzOylar.filter(Boolean).sort()
    : [];
}

export function buildFinancePaymentQuickActionState({
  detailStudent,
  formatMonthKey,
  t,
}) {
  const debtMonths = deriveFinancePaymentDebtMonths(detailStudent);
  const allDebtStartMonth = debtMonths[0] || null;
  const allDebtMonthsCount = debtMonths.length;
  const canFillAllDebts = Boolean(allDebtStartMonth) && allDebtMonthsCount > 0;

  return {
    allDebtStartMonth,
    allDebtMonthsCount,
    canFillAllDebts,
    quickActionDescription: canFillAllDebts
      ? t("Qarzdor oylar: {{count}} ta ({{month}}dan boshlab)", {
          count: allDebtMonthsCount,
          month: formatMonthKey(allDebtStartMonth),
        })
      : t("Qarzdor oylar topilmadi"),
  };
}

export function buildFinanceFillAllDebtsPatch({
  allDebtStartMonth,
  allDebtMonthsCount,
}) {
  if (!allDebtStartMonth || !allDebtMonthsCount) return null;

  return {
    turi: 'OYLIK',
    startMonth: allDebtStartMonth,
    oylarSoni: allDebtMonthsCount,
    summa: '',
  };
}

export function isFinancePaymentSubmitDisabled({
  actionLoading,
  detailStateLoading,
  selectedStudentId,
  isSelectedDetailReady,
  paymentPreview,
}) {
  return Boolean(
    actionLoading ||
      detailStateLoading ||
      (Boolean(selectedStudentId) && !isSelectedDetailReady) ||
      !paymentPreview?.valid ||
      !paymentPreview?.previewMonthsCount,
  );
}
