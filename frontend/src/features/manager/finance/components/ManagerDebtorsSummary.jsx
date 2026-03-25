import { Card } from '../../../../components/ui';

export function ManagerDebtorsSummary({
  t,
  summaryCards,
  globalSummaryState,
}) {
  const statCardClass =
    'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

  return (
    <Card
      title={t("Qarzdorlar ro'yxati")}
      subtitle={t("Menejer faqat qarzdor o'quvchilar bilan ishlaydi va ota-ona bilan aloqa izohini yozadi.")}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className={statCardClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
        {t("Yuqoridagi kartalar umumiy statistika. Pastdagi jadval tanlangan sinf bo'yicha ko'rsatiladi.")}
        {globalSummaryState.error ? ` (${globalSummaryState.error})` : ''}
      </div>
    </Card>
  );
}
