function normalizeTransactionMonths(tx, formatMonthKey) {
  if (Array.isArray(tx.qoplanganOylarFormatted) && tx.qoplanganOylarFormatted.length) {
    return tx.qoplanganOylarFormatted;
  }
  if (Array.isArray(tx.qoplanganOylar) && tx.qoplanganOylar.length) {
    return tx.qoplanganOylar.map((value) => formatMonthKey(value));
  }
  return [];
}

function normalizeImtiyozMonths(item, formatMonthKey) {
  if (Array.isArray(item.oylarFormatted) && item.oylarFormatted.length) {
    return item.oylarFormatted;
  }

  if (Array.isArray(item.oylarSnapshot) && item.oylarSnapshot.length) {
    return item.oylarSnapshot
      .map((snapshot) => {
        const year = Number(snapshot?.yil);
        const month = Number(snapshot?.oy);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
        return formatMonthKey(`${year}-${String(month).padStart(2, '0')}`);
      })
      .filter(Boolean);
  }

  return [];
}

export function buildFinanceLedgerItems({
  transactions = [],
  imtiyozlar = [],
  t,
  paymentTypeLabel,
  imtiyozTypeLabel,
  sumFormat,
  formatMonthKey,
}) {
  const txItems = transactions.flatMap((tx) => {
    const months = normalizeTransactionMonths(tx, formatMonthKey);
    const base = {
      id: `tx-${tx.id}`,
      kind: 'PAYMENT',
      sortDate: tx.tolovSana || tx.createdAt || null,
      title: `${paymentTypeLabel(tx.turi)} ${t("To'lov")}`,
      amount: Number(tx.summa || 0),
      status: tx.holat === 'BEKOR_QILINGAN' ? 'BEKOR_QILINGAN' : 'AKTIV',
      months,
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
          months,
          allocations: tx.qoplamalar || [],
          note: tx.bekorIzoh || '',
          meta: tx,
        },
      ];
    }

    return [base];
  });

  const imtiyozItems = imtiyozlar.flatMap((item) => {
    const months = normalizeImtiyozMonths(item, formatMonthKey);
    const label =
      item.turi === 'FOIZ'
        ? `${imtiyozTypeLabel(item.turi)} (${item.qiymat}%)`
        : item.turi === 'SUMMA'
          ? `${imtiyozTypeLabel(item.turi)} (${sumFormat(item.qiymat)} ${t("so'm")})`
          : imtiyozTypeLabel(item.turi);
    const base = {
      id: `imtiyoz-${item.id}`,
      kind: 'IMTIYOZ',
      sortDate: item.createdAt || null,
      title: `${t('Imtiyoz')}: ${label}`,
      amount: Number(item.qiymat || 0),
      status: item.isActive ? 'AKTIV' : 'BEKOR_QILINGAN',
      months,
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
          months,
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
