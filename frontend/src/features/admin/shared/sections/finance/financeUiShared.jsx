export function MonthChips({ months = [], maxVisible = 3 }) {
  if (!months.length) return <span className="text-slate-400">-</span>;
  const visible = months.slice(0, maxVisible);
  const hiddenCount = Math.max(0, months.length - maxVisible);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span
          key={item}
          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm"
        >
          {item}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
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
