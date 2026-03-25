import { Badge, Button, Input, Select } from '../../../../components/ui';

function FieldLabel({ children }) {
  return (
    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

export default function ClassroomCreateForm({
  t,
  name,
  academicYear,
  academicYearOptions,
  meta,
  loading,
  onNameChange,
  onNameBlur,
  onAcademicYearChange,
  onSelectNextAcademicYear,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 ring-1 ring-slate-200/50"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1.5 md:col-span-1">
          <label className="block">
            <FieldLabel>{t('Sinf nomi')}</FieldLabel>
            <Input
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              onBlur={(event) => onNameBlur(event.target.value)}
              placeholder={t('Masalan: 6-A yoki 10-FizMat')}
            />
          </label>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="block">
            <FieldLabel>{t("O'quv yili")}</FieldLabel>
            <Select
              value={academicYear}
              onChange={(event) => onAcademicYearChange(event.target.value)}
            >
              {academicYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </label>

          {(meta?.currentAcademicYear || meta?.nextAcademicYear) && (
            <div className="flex flex-wrap items-center gap-2">
              {meta?.currentAcademicYear ? (
                <Badge>{t('Joriy')}: {meta.currentAcademicYear}</Badge>
              ) : null}
              {meta?.nextAcademicYear ? (
                <Badge variant="info">{t('Keyingi')}: {meta.nextAcademicYear}</Badge>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <label className="block">
            <FieldLabel>{t('Tez amal')}</FieldLabel>
            <Button
              type="button"
              variant="secondary"
              onClick={onSelectNextAcademicYear}
              disabled={loading}
              className="w-full"
            >
              {t("Kelasi o'quv yili")}
            </Button>
          </label>
        </div>

        <div className="flex justify-end md:col-span-4">
          <Button
            type="submit"
            variant="success"
            disabled={loading}
            className="w-full md:w-auto md:min-w-40"
          >
            {t("Qo'shish")}
          </Button>
        </div>
      </div>
    </form>
  );
}
