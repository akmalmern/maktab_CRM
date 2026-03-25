import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/ui';
import { STUDENT_ATTENDANCE_STATUS_CARDS } from './studentAttendanceModel';

const statCardClass =
  'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

export default function StudentAttendanceOverview({ data }) {
  const { t } = useTranslation();

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={statCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('Davomat foizi')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {data?.statistika?.foiz || 0}%
          </p>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-indigo-600"
              style={{
                width: `${Math.min(100, Math.max(0, Number(data?.statistika?.foiz || 0)))}%`,
              }}
            />
          </div>
        </div>
        <div className={statCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('Jami dars')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {data?.statistika?.jami || 0}
          </p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('Sinf')}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {data?.student?.classroom || '-'}
          </p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('Jami yozuvlar')}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {data?.total || 0}
          </p>
        </div>
      </section>

      <Card title={t('Holatlar kesimi')}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STUDENT_ATTENDANCE_STATUS_CARDS.map(([label, key, className]) => (
            <div
              key={key}
              className={`rounded-xl border px-3 py-3 text-sm shadow-sm ${className}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                {t(label)}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {data?.statistika?.holatlar?.[key] || 0}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
