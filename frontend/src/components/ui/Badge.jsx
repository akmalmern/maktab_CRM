import { cn } from './utils';

const variantClasses = {
  default: 'border border-slate-200 bg-slate-100 text-slate-700',
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  danger: 'border border-rose-200 bg-rose-50 text-rose-700',
  info: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
};

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
