import { useTranslation } from 'react-i18next';
import { translateText } from '../../lib/i18nHelpers';
import { cn } from './utils';

const defaults = {
  loading: {
    title: 'Yuklanmoqda',
    description: "Ma'lumotlar olinmoqda...",
  },
  empty: {
    title: "Ma'lumot topilmadi",
    description: "Hozircha ko'rsatish uchun ma'lumot yo'q.",
  },
  error: {
    title: 'Xatolik yuz berdi',
    description: "So'rov bajarilmadi. Qayta urinib ko'ring.",
  },
  skeleton: {
    title: 'Yuklanmoqda',
    description: "Ma'lumotlar tayyorlanmoqda...",
  },
};

export default function StateView({ type = 'empty', title, description, className }) {
  const { t } = useTranslation();
  const content = defaults[type] || defaults.empty;

  if (type === 'skeleton') {
    return (
      <div className={cn('rounded-lg border border-slate-200 bg-white p-4', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-56 rounded bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6 text-center', className)}>
      <p className="text-base font-semibold text-slate-800">
        {translateText(t, title || content.title)}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {translateText(t, description || content.description)}
      </p>
    </div>
  );
}
