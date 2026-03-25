import { useTranslation } from 'react-i18next';
import {
  Button,
  FilterToolbar,
  FilterToolbarItem,
  Input,
  Select,
} from '../../../components/ui';
import {
  HOLAT_OPTIONS,
  PERIOD_LABEL_KEYS,
  PERIOD_OPTIONS,
  holatLabel,
} from './studentAttendanceModel';

export default function StudentAttendanceFilters({
  sana,
  periodType,
  holat,
  limit,
  page,
  pages,
  period,
  onSanaChange,
  onPeriodTypeChange,
  onHolatChange,
  onLimitChange,
  onReset,
  onRefresh,
}) {
  const { t } = useTranslation();

  return (
    <FilterToolbar
      className="mb-0 mt-0"
      gridClassName="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
      onReset={onReset}
      resetLabel={t('Filterlarni tozalash')}
      resetDisabled={periodType === 'OYLIK' && holat === 'ALL' && Number(limit) === 20}
      actions={
        <Button variant="indigo" size="sm" onClick={onRefresh}>
          {t('Yangilash')}
        </Button>
      }
      footer={
        <>
          {period ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Oraliq')}: {period.from} - {period.to}
            </span>
          ) : null}
          {holat !== 'ALL' ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {t('Filtr')}: {holatLabel(t, holat)}
            </span>
          ) : null}
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Sahifa')}: {page} / {pages}
          </span>
        </>
      }
    >
      <FilterToolbarItem label={t('Sana')}>
        <Input type="date" value={sana} onChange={(event) => onSanaChange(event.target.value)} />
      </FilterToolbarItem>
      <FilterToolbarItem label={t('Period')}>
        <Select value={periodType} onChange={(event) => onPeriodTypeChange(event.target.value)}>
          {PERIOD_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {t(PERIOD_LABEL_KEYS[value] || value)}
            </option>
          ))}
        </Select>
      </FilterToolbarItem>
      <FilterToolbarItem label={t('Holat filtri')}>
        <Select value={holat} onChange={(event) => onHolatChange(event.target.value)}>
          {HOLAT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {holatLabel(t, value)}
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
      <FilterToolbarItem label={t("Ko'rinish")}>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600">
          {t('Davomat tarixi')}
        </div>
      </FilterToolbarItem>
    </FilterToolbar>
  );
}
