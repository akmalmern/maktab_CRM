import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function Card({ title, subtitle, actions, className, children }) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/40',
        className,
      )}
    >
      {(title || subtitle || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                {translateText(t, title)}
              </h2>
            )}
            {subtitle && <p className="mt-1 text-sm text-slate-500">{translateText(t, subtitle)}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
