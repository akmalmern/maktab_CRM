import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui';

export default function DashboardStats({ stats }) {
  const { t } = useTranslation();

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/60"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            {t(stat.label, { defaultValue: stat.label })}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            {stat.value}
          </p>
          <div className="mt-2">
            <Badge variant="indigo">{t(stat.label, { defaultValue: stat.label })}</Badge>
          </div>
        </div>
      ))}
    </section>
  );
}
