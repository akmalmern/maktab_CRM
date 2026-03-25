export function FinanceMonthChips({
  items,
  months,
  maxVisible = 3,
  tone = 'neutral',
  emptyLabel = '-',
}) {
  const values = Array.isArray(items) ? items : Array.isArray(months) ? months : [];
  if (!values.length) return <span className="text-slate-400">{emptyLabel}</span>;

  const visible = values.slice(0, maxVisible);
  const hiddenCount = Math.max(0, values.length - maxVisible);
  const toneClasses = {
    neutral:
      'rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm',
    danger:
      'rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 shadow-none',
  };
  const overflowClasses = {
    neutral:
      'rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700',
    danger:
      'rounded-full border border-rose-200 bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 shadow-none',
  };

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span key={item} className={toneClasses[tone] || toneClasses.neutral}>
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className={overflowClasses[tone] || overflowClasses.neutral}>+{hiddenCount}</span>
      )}
    </div>
  );
}
