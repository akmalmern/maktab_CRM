import { Button, Card, Input, Select } from '../../../components/ui';
import { formatHours } from './teacherScheduleModel';

export default function TeacherScheduleHeader({
  t,
  oquvYili,
  oquvYillar,
  monthKey,
  loadSummary,
  onOquvYiliChange,
  onMonthKeyChange,
  onRefresh,
}) {
  return (
    <Card title={t('Mening haftalik jadvalim')}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRefresh();
        }}
        className="grid grid-cols-1 gap-2 md:grid-cols-[240px_200px_auto]"
      >
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
        <Input
          type="month"
          value={monthKey}
          onChange={(event) => onMonthKeyChange(event.target.value)}
        />
        <Button type="submit" variant="indigo">
          {t('Jadvalni yangilash')}
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          {t('Haftalik darslar')}: {loadSummary.weeklyLessonCount}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          {t('Haftalik soat')}: {formatHours(loadSummary.weeklyHours)}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          {t("Oy bo'yicha darslar")}: {loadSummary.monthlyLessonCount}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-800">
          {t("Oy bo'yicha soat")}: {formatHours(loadSummary.monthlyHours)}
        </span>
      </div>
    </Card>
  );
}
