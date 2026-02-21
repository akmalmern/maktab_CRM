import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function Card({ title, subtitle, actions, className, children }) {
  const { t } = useTranslation();

  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {(title || subtitle || actions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-semibold text-slate-900">{translateText(t, title)}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{translateText(t, subtitle)}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
