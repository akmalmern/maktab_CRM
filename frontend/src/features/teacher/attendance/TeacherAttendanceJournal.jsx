import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DataTable, Input, Select, StateView } from '../../../components/ui';
import {
  BAHO_TURI_OPTIONS,
  FIELD_LABEL_CLASS,
  FIELD_WRAP_CLASS,
  HOLAT_OPTIONS,
  bahoTuriLabel,
  formatTeacherAttendanceDarsLabel,
  holatLabel,
} from './teacherAttendanceModel';

export default function TeacherAttendanceJournal({
  sana,
  onSanaChange,
  oquvYili,
  oquvYillar,
  onOquvYiliChange,
  darslar,
  selectedDarsId,
  onSelectedDarsIdChange,
  detail,
  loading,
  error,
  saving,
  onRefresh,
  onSave,
  onUpdateStudent,
  onApplyBulkHolat,
}) {
  const { t } = useTranslation();

  const columns = useMemo(
    () => [
      { key: 'fullName', header: t("O'quvchi"), render: (row) => row.fullName },
      { key: 'username', header: t('Username'), render: (row) => row.username || '-' },
      {
        key: 'holat',
        header: t('Holat'),
        render: (row) => (
          <Select
            value={row.holat}
            onChange={(event) => onUpdateStudent(row.id, { holat: event.target.value })}
          >
            {HOLAT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {holatLabel(t, value)}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'bahoTuri',
        header: t('Baho turi'),
        render: (row) => (
          <Select
            value={row.bahoTuri || 'JORIY'}
            onChange={(event) => onUpdateStudent(row.id, { bahoTuri: event.target.value })}
          >
            {BAHO_TURI_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {bahoTuriLabel(t, value)}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'bahoBall',
        header: t('Ball'),
        render: (row) => (
          <Input
            type="number"
            min={0}
            max={100}
            value={row.bahoBall}
            onChange={(event) => onUpdateStudent(row.id, { bahoBall: event.target.value })}
            placeholder={t('Masalan: 4')}
          />
        ),
      },
      {
        key: 'bahoMaxBall',
        header: t('Max ball'),
        render: (row) => (
          <Input
            type="number"
            min={1}
            max={100}
            value={row.bahoMaxBall ?? 5}
            onChange={(event) => onUpdateStudent(row.id, { bahoMaxBall: event.target.value })}
            placeholder="5"
          />
        ),
      },
    ],
    [onUpdateStudent, t],
  );

  return (
    <>
      <Card
        title={t("Davomat jurnali")}
        subtitle={t('Sana va darsni tanlab davomat hamda baholarni saqlang.')}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className={FIELD_WRAP_CLASS}>
            <p className={FIELD_LABEL_CLASS}>{t('Sana')}</p>
            <Input type="date" value={sana} onChange={(event) => onSanaChange(event.target.value)} />
          </div>
          <div className={FIELD_WRAP_CLASS}>
            <p className={FIELD_LABEL_CLASS}>{t("O'quv yili")}</p>
            <Select value={oquvYili} onChange={(event) => onOquvYiliChange(event.target.value)}>
              {oquvYillar.length ? (
                oquvYillar.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              ) : (
                <option value={oquvYili || ''}>{oquvYili || t("O'quv yili topilmadi")}</option>
              )}
            </Select>
          </div>
          <div className={FIELD_WRAP_CLASS}>
            <p className={FIELD_LABEL_CLASS}>{t('Darsni tanlang')}</p>
            <Select value={selectedDarsId} onChange={(event) => onSelectedDarsIdChange(event.target.value)}>
              {!darslar.length && <option value="">{t('Bugun dars topilmadi')}</option>}
              {darslar.map((dars) => (
                <option key={dars.id} value={dars.id}>
                  {formatTeacherAttendanceDarsLabel(dars)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="indigo" className="w-full" onClick={onRefresh}>
              {t('Yangilash')}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t('Topilgan darslar')}: {darslar.length}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {t("Ko'rinish")}: {t('Jurnal')}
          </span>
        </div>
      </Card>

      {loading ? <StateView type="loading" /> : null}
      {!loading && error ? <StateView type="error" description={error} /> : null}
      {!loading && !error && !detail && !darslar.length ? (
        <StateView type="empty" description={t('Tanlangan sana uchun dars topilmadi')} />
      ) : null}

      {!loading && !error && detail ? (
        <Card
          title={`${detail.dars?.sinf?.name || ''} / ${detail.dars?.fan?.name || ''}`}
          subtitle={`${detail.sana} - ${detail.dars?.vaqtOraliq?.boshlanishVaqti || ''}`}
          actions={
            <Button variant="success" onClick={onSave} disabled={saving}>
              {saving ? t('Saqlanmoqda...') : t('Davomatni saqlash')}
            </Button>
          }
        >
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">{t("O'quvchilar")}</p>
              <p className="font-semibold text-slate-900">{detail.students?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">{t('Fan')}</p>
              <p className="truncate font-semibold text-slate-900">{detail.dars?.fan?.name || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">{t('Sinf')}</p>
              <p className="font-semibold text-slate-900">{detail.dars?.sinf?.name || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">{t('Vaqt')}</p>
              <p className="font-semibold text-slate-900">{detail.dars?.vaqtOraliq?.boshlanishVaqti || '-'}</p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {HOLAT_OPTIONS.map((value) => (
              <Button
                key={value}
                size="sm"
                variant="secondary"
                onClick={() => onApplyBulkHolat(value)}
              >
                {t('Barchaga')}: {holatLabel(t, value)}
              </Button>
            ))}
          </div>
          {detail.students?.length ? (
            <DataTable
              columns={columns}
              rows={detail.students}
              stickyFirstColumn
              density="compact"
              maxHeightClassName="max-h-[520px]"
            />
          ) : (
            <StateView type="empty" description={t('Bu dars uchun studentlar topilmadi')} />
          )}
          {detail.students?.length ? (
            <div className="sticky bottom-2 z-10 mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow">
              <p className="text-xs text-slate-600">{t('Tezkor saqlash')}: {t('Ctrl+S')}</p>
              <Button variant="success" onClick={onSave} disabled={saving}>
                {saving ? t('Saqlanmoqda...') : t('Davomatni saqlash')}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
