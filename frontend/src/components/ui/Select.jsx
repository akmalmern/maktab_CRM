import { useTranslation } from 'react-i18next';
import { translateNode } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function Select({ className, children, ...props }) {
  const { t } = useTranslation();

  return (
    <select
      className={cn(
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:bg-slate-100 disabled:text-slate-500',
        className,
      )}
      {...props}
    >
      {translateNode(t, children)}
    </select>
  );
}
