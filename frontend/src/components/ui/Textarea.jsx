import { cn } from './utils';

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        className,
      )}
      {...props}
    />
  );
}
