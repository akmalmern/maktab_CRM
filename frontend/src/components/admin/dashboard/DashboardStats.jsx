import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/ui';

export default function DashboardStats({ stats }) {
  const { t } = useTranslation();

  return (
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white shadow-sm"
        >
          <p className="text-xs uppercase tracking-widest text-slate-300">
            {t(stat.label, { defaultValue: stat.label })}
          </p>
          <p className="mt-3 text-3xl font-bold">{stat.value}</p>
          <div className="mt-2">
            <Badge>{t(stat.label, { defaultValue: stat.label })}</Badge>
          </div>
        </div>
      ))}
      </section>
  );
}
