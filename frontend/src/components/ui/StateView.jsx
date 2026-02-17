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
};

export default function StateView({ type = 'empty', title, description, className }) {
  const content = defaults[type] || defaults.empty;

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-6 text-center', className)}>
      <p className="text-base font-semibold text-slate-800">{title || content.title}</p>
      <p className="mt-1 text-sm text-slate-500">{description || content.description}</p>
    </div>
  );
}
