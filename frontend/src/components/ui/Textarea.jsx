import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

export default function Textarea({ className, placeholder, ...props }) {
  const { t } = useTranslation();

  return (
    <textarea
      className={cn(
        'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:bg-slate-100 disabled:text-slate-500',
        className,
      )}
      placeholder={translateText(t, placeholder)}
      {...props}
    />
  );
}
