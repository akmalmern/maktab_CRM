import {
  buildFinanceCashflowCards,
  buildFinanceCashflowDiffView,
} from './financeCashflowViewModel';

export default function FinanceCashflowMetrics({
  t,
  cashflowPanel,
  locale,
  sumFormat,
  MiniStatCard,
}) {
  void MiniStatCard;
  const { primaryCards, secondaryCards } = buildFinanceCashflowCards({
    cashflowPanel,
    locale,
    sumFormat,
    t,
  });
  const diffView = buildFinanceCashflowDiffView({
    diffAmount: cashflowPanel.diffAmount,
    locale,
    sumFormat,
    t,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {primaryCards.map((card) => (
          <MiniStatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">{t('Rejaga nisbatan farq')}</p>
          <p className={`mt-1 text-base font-semibold ${diffView.className}`}>
            {diffView.value}
          </p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        {secondaryCards.map((card) => (
          <MiniStatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>
    </>
  );
}
