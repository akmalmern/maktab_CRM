import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateNode } from '../../lib/i18nHelpers';
import { cn } from './utils';

const variantClasses = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-700',
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
