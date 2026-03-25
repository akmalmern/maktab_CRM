import FinanceCashflowMetrics from './FinanceCashflowMetrics';
import FinanceCashflowToolbar from './FinanceCashflowToolbar';

export default function FinanceCashflowPanel({
  t,
  query,
  onChangeQuery,
  cashflowPanel,
  locale,
  sumFormat,
  MiniStatCard,
  onOpenPayroll,
}) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50">
      <FinanceCashflowToolbar
        t={t}
        query={query}
        onChangeQuery={onChangeQuery}
        onOpenPayroll={onOpenPayroll}
      />
      <p className="mb-1 text-xs text-slate-600">
        {t("Tanlangan hisobot oyi")}: {cashflowPanel.month}
      </p>
      <p className="mb-2 text-xs text-slate-500">
        {t("Reja = kutilgan tushum, Tushum = amalda tushgan pul, Qarz = shu oy yopilmagan summa.")}
      </p>
      <FinanceCashflowMetrics
        t={t}
        cashflowPanel={cashflowPanel}
        locale={locale}
        sumFormat={sumFormat}
        MiniStatCard={MiniStatCard}
      />
    </div>
  );
}
