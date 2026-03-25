import { FinanceMonthChips } from '../../../../shared/finance/components/FinanceMonthChips';

export function MonthChips({ months = [], maxVisible = 3 }) {
  return <FinanceMonthChips months={months} maxVisible={maxVisible} tone="neutral" />;
}

export function FieldLabel({ children }) {
  return (
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

export function MiniStatCard({ label, value, tone = 'default' }) {
  const toneClasses = {
    default: 'border-slate-200 bg-white text-slate-900',
    info: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    danger: 'border-rose-200 bg-rose-50/70 text-rose-900',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 shadow-sm ${toneClasses[tone] || toneClasses.default}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-tight">{value}</p>
    </div>
  );
}
