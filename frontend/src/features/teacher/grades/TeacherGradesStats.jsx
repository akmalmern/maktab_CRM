import { useTranslation } from 'react-i18next';
import {
  TEACHER_GRADE_STATS_KEYS,
  formatTeacherGradeTypeLabel,
} from './teacherGradesModel';

const statCardClass =
  'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-200/50';

export default function TeacherGradesStats({ data }) {
  const { t } = useTranslation();

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {TEACHER_GRADE_STATS_KEYS.map((key) => (
        <div key={key} className={statCardClass}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {formatTeacherGradeTypeLabel(t, key)}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {data?.stats?.[key]?.count || 0} {t('ta')} / {data?.stats?.[key]?.avg || 0}%
          </p>
        </div>
      ))}
    </section>
  );
}
