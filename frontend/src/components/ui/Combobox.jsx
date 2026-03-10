import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from './utils';

export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Tanlang',
  disabled = false,
  noOptionsText = "Ma'lumot topilmadi",
  className,
  inputClassName,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((opt) => String(opt.value) === String(value || '')) || null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options
      .filter((opt) => {
        const hay = `${opt.label || ''} ${opt.searchText || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 100);
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const displayValue = open ? query : selected?.label || '';

  function handleSelect(optionValue) {
    onChange?.({
      target: { value: optionValue },
      currentTarget: { value: optionValue },
    });
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:bg-slate-100 disabled:text-slate-500',
          inputClassName,
        )}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(e.target.value);
        }}
      />
      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            className="block w-full rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </button>
          {filteredOptions.length ? (
            filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value || '');
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  className={cn(
                    'block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100',
                    isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-800',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })
          ) : (
            <div className="px-2 py-2 text-sm text-slate-500">{noOptionsText}</div>
          )}
        </div>
      )}
    </div>
  );
}
