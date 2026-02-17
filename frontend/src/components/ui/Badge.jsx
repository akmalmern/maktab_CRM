import { cn } from './utils';

const variantClasses = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-rose-100 text-rose-800',
  info: 'bg-indigo-100 text-indigo-800',
};

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', variantClasses[variant], className)}>
      {children}
    </span>
  );
}
