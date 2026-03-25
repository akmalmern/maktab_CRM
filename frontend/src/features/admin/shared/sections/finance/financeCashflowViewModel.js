export function buildFinanceCashflowCards({
  cashflowPanel,
  locale,
  sumFormat,
  t,
}) {
  return {
    primaryCards: [
      {
        label: t("Oylik reja (kutilgan tushum)"),
        value: `${sumFormat(cashflowPanel.planAmount, locale)} ${t("so'm")}`,
      },
      {
        label: t('Amalda tushgan pul'),
        value: `${sumFormat(cashflowPanel.collectedAmount, locale)} ${t("so'm")}`,
        tone: 'success',
      },
      {
        label: t('Shu oy qarz summasi'),
        value: `${sumFormat(cashflowPanel.debtAmount, locale)} ${t("so'm")}`,
        tone: 'danger',
      },
    ],
    secondaryCards: [
      {
        label: t("Oylik chiqimi (payroll)"),
        value: `${sumFormat(cashflowPanel.payrollPayoutAmount || 0, locale)} ${t("so'm")}`,
        tone: 'warning',
      },
      {
        label: t("Oylik qaytarma (reversal)"),
        value: `${sumFormat(cashflowPanel.payrollReversalAmount || 0, locale)} ${t("so'm")}`,
        tone: 'info',
      },
      {
        label: t("Sof pul oqimi (tushum - oylik)"),
        value: `${sumFormat(cashflowPanel.netAmount || 0, locale)} ${t("so'm")}`,
        tone: (cashflowPanel.netAmount || 0) >= 0 ? 'success' : 'danger',
      },
    ],
  };
}

export function buildFinanceCashflowDiffView({
  diffAmount,
  locale,
  sumFormat,
  t,
}) {
  const diffLabel =
    diffAmount > 0
      ? ` ${t('kam tushgan')}`
      : diffAmount < 0
        ? ` ${t("ko'p tushgan")}`
        : '';

  return {
    className: diffAmount > 0 ? 'text-rose-700' : 'text-emerald-700',
    value: `${sumFormat(Math.abs(diffAmount), locale)} ${t("so'm")}${diffLabel}`,
  };
}
