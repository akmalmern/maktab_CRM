export function getRunStatusLabel(value, t) {
  const labels = {
    DRAFT: t('Loyiha'),
    APPROVED: t('Tasdiqlangan'),
    PAID: t("To'langan"),
    REVERSED: t('Bekor qilingan'),
  };
  return labels[value] || value || '-';
}

export function getPaymentMethodLabel(value, t) {
  const labels = {
    BANK: t("Bank o'tkazmasi"),
    CASH: t('Naqd pul'),
    CLICK: t('Click'),
    PAYME: t('Payme'),
  };
  return labels[value] || value || '-';
}
