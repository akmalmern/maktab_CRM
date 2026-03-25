import { useTranslation } from 'react-i18next';
import {
  Button,
  FilterToolbar,
  FilterToolbarItem,
  Input,
  Select,
} from '../../../components/ui';
import {
  BAHO_TURI_OPTIONS,
  formatTeacherGradeTypeLabel,
  isTeacherGradesFilterPristine,
} from './teacherGradesModel';

export default function TeacherGradesFilters({
  sana,
  bahoTuri,
  classroomId,
  limit,
  page,
  pages,
  total,
  classrooms,
  onSanaChange,
  onClassroomChange,
  onBahoTuriChange,
  onLimitChange,
  onReset,
  onRefresh,
}) {
  const { t } = useTranslation();

  return (
    <>
      <FilterToolbar
        className="mb-0 mt-0"
        gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
        onReset={onReset}
        resetLabel={t('Filterlarni tozalash')}
        resetDisabled={isTeacherGradesFilterPristine({ sana, classroomId, bahoTuri, limit })}
        actions={
          <Button variant="indigo" size="sm" onClick={onRefresh}>
            {t('Yangilash')}
          </Button>
        }
      >
        <FilterToolbarItem label={t('Sana')}>
          <Input type="date" value={sana} onChange={(event) => onSanaChange(event.target.value)} />
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Sinf')}>
          <Select value={classroomId} onChange={(event) => onClassroomChange(event.target.value)}>
            <option value="ALL">{t('Barcha sinflar')}</option>
            {classrooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.academicYear})
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Baho turi')}>
          <Select value={bahoTuri} onChange={(event) => onBahoTuriChange(event.target.value)}>
            {BAHO_TURI_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatTeacherGradeTypeLabel(t, value)}
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Sahifa limiti')}>
          <Select value={String(limit)} onChange={(event) => onLimitChange(Number(event.target.value))}>
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {t('{{count}} ta / sahifa', { count: size })}
              </option>
            ))}
          </Select>
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Joriy sinflar')}>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {classrooms.length}
          </div>
        </FilterToolbarItem>
      </FilterToolbar>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {t('Sahifa')}: {page} / {pages}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {t('Jami')}: {total}
        </span>
      </div>
    </>
  );
}
