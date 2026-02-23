import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateNode } from '../../lib/i18nHelpers';
import { cn } from './utils';

const variantClasses = {
  primary:
    'border border-indigo-700 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-800',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400',
  success:
    'border border-emerald-700 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:border-emerald-800',
  danger:
    'border border-rose-700 bg-rose-600 text-white shadow-sm hover:bg-rose-700 hover:border-rose-800',
  indigo:
    'border border-indigo-700 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-800',
};

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-sm',
};

const Button = forwardRef(function Button(
  { children, className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref,
) {
  const { t } = useTranslation();

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {translateNode(t, children)}
    </button>
  );
});

export default Button;
