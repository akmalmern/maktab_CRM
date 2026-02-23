import { useTranslation } from 'react-i18next';
import { cn } from './utils';
import Button from './Button';

export function FilterToolbarItem({ label, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label ? (
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export default function FilterToolbar({
  children,
  className,
  gridClassName,
  footer,
  onReset,
  resetLabel,
  resetDisabled = false,
  actions,
}) {
  const { t } = useTranslation();

  return (
    <div className={cn('mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50', className)}>
      <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-2', gridClassName)}>{children}</div>

      {(actions || onReset || footer) && (
        <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
          {(actions || onReset) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {onReset ? (
                <Button variant="secondary" size="sm" onClick={onReset} disabled={resetDisabled}>
                  {resetLabel || t('Reset')}
                </Button>
              ) : null}
              {actions}
            </div>
          )}
          {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}
        </div>
      )}
    </div>
  );
}

