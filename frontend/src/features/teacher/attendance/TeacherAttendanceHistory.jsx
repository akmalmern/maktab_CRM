import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../../components/ui';
import {
  FIELD_LABEL_CLASS,
  FIELD_WRAP_CLASS,
  HISTORY_HOLAT_SHORTCUTS,
  HOLAT_OPTIONS,
  PERIOD_LABEL_KEYS,
  PERIOD_OPTIONS,
  holatLabel,
} from './teacherAttendanceModel';

export default function TeacherAttendanceHistory({
  sana,
  onSanaChange,
  tarixPeriodType,
  onTarixPeriodTypeChange,
  tarixHolat,
  onTarixHolatChange,
  tarixLimit,
  onTarixLimitChange,
  tarixPage,
  tarixPages,
  tarixRange,
  tarixTotal,
  tarix,
  loading,
  error,
  onRefresh,
  onTarixPageChange,
}) {
  const { t } = useTranslation();

  const tarixColumns = useMemo(
    () => [
      { key: 'sana', header: t('Sana'), render: (row) => row.sana },
      { key: 'sinf', header: t('Sinf'), render: (row) => row.sinf },
      { key: 'fan', header: t('Fan'), render: (row) => row.fan },
      { key: 'vaqtOraliq', header: t('Vaqt'), render: (row) => row.vaqtOraliq },
      {
        key: 'holat',
        header: t('Holatlar'),
        render: (row) =>
          `${t('Keldi')}: ${row.holatlar?.KELDI || 0} / ${t('Kechikdi')}: ${row.holatlar?.KECHIKDI || 0} / ${t('Sababli')}: ${row.holatlar?.SABABLI || 0} / ${t('Sababsiz')}: ${row.holatlar?.SABABSIZ || 0}`,
      },
      { key: 'jami', header: t('Jami'), render: (row) => row.jami || 0 },
    ],
    [t],
  );

  return (
    <Card title={t("O'tilgan darslar davomat tarixi")}>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className={FIELD_WRAP_CLASS}>
          <p className={FIELD_LABEL_CLASS}>{t('Sana')}</p>
          <Input type="date" value={sana} onChange={(event) => onSanaChange(event.target.value)} />
        </div>
        <div className={FIELD_WRAP_CLASS}>
          <p className={FIELD_LABEL_CLASS}>{t('Period')}</p>
          <Select value={tarixPeriodType} onChange={(event) => onTarixPeriodTypeChange(event.target.value)}>
            {PERIOD_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(PERIOD_LABEL_KEYS[value] || value)}
              </option>
            ))}
          </Select>
        </div>
        <div className={FIELD_WRAP_CLASS}>
          <p className={FIELD_LABEL_CLASS}>{t('Holat')}</p>
          <Select value={tarixHolat} onChange={(event) => onTarixHolatChange(event.target.value)}>
            <option value="ALL">{t('Barcha holatlar')}</option>
            {HOLAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {holatLabel(t, value)}
              </option>
            ))}
          </Select>
        </div>
        <div className={FIELD_WRAP_CLASS}>
          <p className={FIELD_LABEL_CLASS}>{t('Sahifa limiti')}</p>
          <Select value={String(tarixLimit)} onChange={(event) => onTarixLimitChange(Number(event.target.value))}>
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {t('{{count}} ta / sahifa', { count: size })}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={onRefresh}>
            {t('Tarixni yangilash')}
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {HISTORY_HOLAT_SHORTCUTS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={tarixHolat === value ? 'indigo' : 'secondary'}
            onClick={() => onTarixHolatChange(value)}
          >
            {value === 'ALL' ? t('Hammasi') : holatLabel(t, value)}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {tarixRange ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Tanlangan oraliq')}: {tarixRange.from} - {tarixRange.to}
          </span>
        ) : null}
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {t('Sahifa')}: {tarixPage} / {tarixPages}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {t('Jami yozuvlar')}: {tarixTotal}
        </span>
      </div>
      {loading ? <StateView type="loading" /> : null}
      {!loading && error ? <StateView type="error" description={error} /> : null}
      {!loading && !error && tarix.length ? (
        <>
          <DataTable
            columns={tarixColumns}
            rows={tarix}
            stickyHeader
            stickyFirstColumn
            density="compact"
            maxHeightClassName="max-h-[420px]"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => onTarixPageChange(Math.max(1, tarixPage - 1))}
              disabled={tarixPage <= 1}
            >
              {t('Oldingi')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onTarixPageChange(Math.min(tarixPages, tarixPage + 1))}
              disabled={tarixPage >= tarixPages}
            >
              {t('Keyingi')}
            </Button>
          </div>
        </>
      ) : null}
      {!loading && !error && !tarix.length ? (
        <StateView type="empty" description={t("Tanlangan period bo'yicha tarix topilmadi")} />
      ) : null}
    </Card>
  );
}
