import { Button, Input, Select } from '../../../../../components/ui';

export default function FinancePaymentsFilters({
  t,
  query,
  onChangeQuery,
  classrooms,
  exporting,
  onExportDebtors,
}) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 ring-1 ring-slate-200/50">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
        <Input
          type="text"
          value={query.search}
          onChange={(e) => onChangeQuery({ search: e.target.value, page: 1 })}
          placeholder={t("Ism yoki username...")}
        />
        <Select value={query.status} onChange={(e) => onChangeQuery({ status: e.target.value, page: 1 })}>
          <option value="ALL">{t('Hammasi')}</option>
          <option value="QARZDOR">{t('Faqat qarzdor')}</option>
          <option value="TOLAGAN">{t("Faqat to'lagan")}</option>
        </Select>
        <Select value={query.classroomId} onChange={(e) => onChangeQuery({ classroomId: e.target.value, page: 1 })}>
          <option value="all">{t('Barcha sinflar')}</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.academicYear})
            </option>
          ))}
        </Select>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={() => onExportDebtors('xlsx')}
            disabled={exporting === 'xlsx'}
            className="w-full"
          >
            {t('Qarzdorlar Excel')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onExportDebtors('pdf')}
            disabled={exporting === 'pdf'}
            className="w-full"
          >
            {t('Qarzdorlar PDF')}
          </Button>
        </div>
      </div>
    </div>
  );
}
