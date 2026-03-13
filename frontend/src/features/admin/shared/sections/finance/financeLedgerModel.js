import { imtiyozTypeLabel, paymentTypeLabel, sumFormat } from './financeSectionModel';

export function buildFinanceLedgerItems({ transactions = [], imtiyozlar = [], t, locale }) {
  const txItems = transactions.flatMap((tx) => {
    const base = {
      id: `tx-${tx.id}`,
      kind: 'PAYMENT',
      sortDate: tx.tolovSana || tx.createdAt || null,
      title: `${paymentTypeLabel(tx.turi, t)} ${t("To'lov")}`,
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
          title: t("To'lov bekor qilindi"),
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
        ? `${imtiyozTypeLabel(item.turi, t)} (${item.qiymat}%)`
        : item.turi === 'SUMMA'
          ? `${imtiyozTypeLabel(item.turi, t)} (${sumFormat(item.qiymat, locale)} ${t("so'm")})`
          : imtiyozTypeLabel(item.turi, t);
    const base = {
      id: `imtiyoz-${item.id}`,
      kind: 'IMTIYOZ',
      sortDate: item.createdAt || null,
      title: `${t('Imtiyoz')}: ${label}`,
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
          title: t('Imtiyoz bekor qilindi'),
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
