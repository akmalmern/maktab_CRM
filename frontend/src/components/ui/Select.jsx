import { useTranslation } from 'react-i18next';
import { translateNode } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function Select({ className, children, ...props }) {
  const { t } = useTranslation();

  return (
    <select
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        className,
      )}
      {...props}
    >
      {translateNode(t, children)}
    </select>
  );
}
