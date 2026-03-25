export function paymentTypeLabel(type, t) {
  if (type === 'YILLIK') return t('Yillik');
  if (type === 'IXTIYORIY') return t('Ixtiyoriy');
  return t('Oylik');
}

export function imtiyozTypeLabel(type, t) {
  if (type === 'FOIZ') return t('Foiz');
  if (type === 'SUMMA') return t('Summa');
  if (type === 'TOLIQ_OZOD') return t("To'liq ozod");
  return type || '-';
}
