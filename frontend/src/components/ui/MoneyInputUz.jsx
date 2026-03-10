import { useMemo } from 'react';
import { cn } from './utils';

function normalizeRaw(rawValue) {
  const text = String(rawValue ?? '');
  return text.replace(/[^\d]/g, '');
}

function formatWithSpaces(rawValue) {
  const normalized = normalizeRaw(rawValue);
  if (!normalized) return '';
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function MoneyInputUz({
  value,
  onValueChange,
  className,
  placeholder = '0',
  disabled = false,
  inputMode = 'numeric',
  ...props
}) {
  const displayValue = useMemo(() => formatWithSpaces(value), [value]);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode={inputMode}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-12 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:bg-slate-100 disabled:text-slate-500',
          className,
        )}
        onChange={(e) => {
          onValueChange?.(normalizeRaw(e.target.value));
        }}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold tracking-wide text-slate-400">
        UZS
      </span>
    </div>
  );
}
