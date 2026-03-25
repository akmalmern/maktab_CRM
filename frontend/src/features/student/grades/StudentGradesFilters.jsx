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
  formatGradeTypeLabel,
  isStudentGradesFilterPristine,
} from './studentGradesModel';

export default function StudentGradesFilters({
  sana,
  bahoTuri,
  activeView,
  limit,
  page,
  pages,
  total,
  classroom,
  isAnonymized,
  onSanaChange,
  onBahoTuriChange,
  onLimitChange,
  onReset,
  onRefresh,
  onActiveViewChange,
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
        <Button
          variant={activeView === 'mine' ? 'indigo' : 'ghost'}
          size="sm"
          onClick={() => onActiveViewChange('mine')}
        >
          {t('Mening baholarim')}
        </Button>
        <Button
          variant={activeView === 'class' ? 'indigo' : 'ghost'}
          size="sm"
          onClick={() => onActiveViewChange('class')}
        >
          {t('Sinf baholari')}
        </Button>
      </div>
      <FilterToolbar
        className="mb-0 mt-0"
        gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
        onReset={onReset}
        resetLabel={t('Filterlarni tozalash')}
        resetDisabled={isStudentGradesFilterPristine({ sana, bahoTuri, limit })}
        actions={
          <Button variant="indigo" size="sm" onClick={onRefresh}>
            {t('Yangilash')}
          </Button>
        }
      >
        <FilterToolbarItem label={t('Sana')}>
          <Input type="date" value={sana} onChange={(event) => onSanaChange(event.target.value)} />
        </FilterToolbarItem>
        <FilterToolbarItem label={t('Baho turi')}>
          <Select value={bahoTuri} onChange={(event) => onBahoTuriChange(event.target.value)}>
            {BAHO_TURI_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {formatGradeTypeLabel(t, value)}
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
        <FilterToolbarItem label={t('Sinf')}>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
            {activeView === 'class'
              ? classroom || t('Mening sinfim')
              : t("Faqat 'Sinf baholari' ko'rinishida")}
          </div>
        </FilterToolbarItem>
        <FilterToolbarItem label={t("Ko'rinish")}>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
            {activeView === 'mine' ? t('Mening baholarim') : t('Sinf baholari')}
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
        {activeView === 'class' && isAnonymized ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t("Anonim ko'rinish")}
          </span>
        ) : null}
      </div>
      {activeView === 'class' && isAnonymized ? (
        <p className="mt-2 text-xs text-slate-500">
          {t("Sinf baholari anonim ko'rinishda (individual o'quvchi ma'lumoti yashirilgan).")}
        </p>
      ) : null}
    </>
  );
}
