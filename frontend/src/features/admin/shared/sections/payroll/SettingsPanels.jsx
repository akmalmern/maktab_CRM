import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Combobox,
  DataTable,
  Input,
  MoneyInputUz,
  Select,
  StateView,
  Tabs,
  Textarea,
} from '../../../../../components/ui';

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function getEmployeeKindLabel(value, t) {
  const labels = {
    TEACHER: t("O'qituvchi"),
    STAFF: t('Xodim'),
  };
  return labels[value] || value || '-';
}

function getPayrollModeLabel(value, t) {
  const labels = {
    LESSON_BASED: t("Dars asosida"),
    FIXED: t('Oklad'),
    MIXED: t('Dars + oklad'),
    MANUAL_ONLY: t("Faqat qo'lda"),
  };
  return labels[value] || value || '-';
}

function getEmploymentStatusLabel(value, t) {
  const labels = {
    ACTIVE: t('Faol'),
    INACTIVE: t('Nofaol'),
    ARCHIVED: t('Arxiv'),
  };
  return labels[value] || value || '-';
}

function getLessonStatusLabel(value, t) {
  const labels = {
    DONE: t('Bajarilgan'),
    CANCELED: t('Bekor qilingan'),
    REPLACED: t("Almashtirilgan"),
  };
  return labels[value] || value || '-';
}

export function PayrollSettingsHeader({
  tab,
  isManagerView,
  settingsTab,
  setSettingsTab,
  settingsTabs,
}) {
  const { t } = useTranslation();

  if (isManagerView || tab !== 'settings') return null;

  return (
    <Card
      title={t('Kengaytirilgan')}
      subtitle={t("Faqat oylikka tegishli sozlamalar. O'tilgan darslar va avanslar mos bo'limlarga ko'chirildi.")}
    >
      <Tabs value={settingsTab} onChange={setSettingsTab} items={settingsTabs} />
    </Card>
  );
}

export function PayrollConfigPanel({
  tab,
  settingsTab,
  isManagerView,
  employeeConfigFilters,
  setEmployeeConfigFilters,
  payrollEmployeesQuery,
  payrollEmployeesState,
  payrollEmployeeColumns,
  payrollEmployees,
}) {
  const { t } = useTranslation();

  if (isManagerView || tab !== 'settings' || settingsTab !== 'config') return null;

  return (
    <Card
      title={t('Oylik sozlamalari')}
      subtitle={t("Xodimlar uchun oylik turi, oklad va oylikka kirish holatini sozlang.")}
      actions={(
        <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
          <Input
            value={employeeConfigFilters.search}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            placeholder={t('Qidirish')}
          />
          <Select
            value={employeeConfigFilters.kind}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, kind: e.target.value, page: 1 }))}
          >
            <option value="">{t('Barcha tur')}</option>
            <option value="TEACHER">{getEmployeeKindLabel('TEACHER', t)}</option>
            <option value="STAFF">{getEmployeeKindLabel('STAFF', t)}</option>
          </Select>
          <Select
            value={employeeConfigFilters.payrollMode}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, payrollMode: e.target.value, page: 1 }))}
          >
            <option value="">{t('Barcha rejim')}</option>
            <option value="LESSON_BASED">{getPayrollModeLabel('LESSON_BASED', t)}</option>
            <option value="FIXED">{getPayrollModeLabel('FIXED', t)}</option>
            <option value="MIXED">{getPayrollModeLabel('MIXED', t)}</option>
            <option value="MANUAL_ONLY">{getPayrollModeLabel('MANUAL_ONLY', t)}</option>
          </Select>
          <Select
            value={employeeConfigFilters.employmentStatus}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, employmentStatus: e.target.value, page: 1 }))}
          >
            <option value="">{t('Barcha bandlik')}</option>
            <option value="ACTIVE">{getEmploymentStatusLabel('ACTIVE', t)}</option>
            <option value="INACTIVE">{getEmploymentStatusLabel('INACTIVE', t)}</option>
            <option value="ARCHIVED">{getEmploymentStatusLabel('ARCHIVED', t)}</option>
          </Select>
          <Select
            value={employeeConfigFilters.isPayrollEligible}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, isPayrollEligible: e.target.value, page: 1 }))}
          >
            <option value="">{t("Oylikka kirish (hammasi)")}</option>
            <option value="true">{t('Faqat kiradi')}</option>
            <option value="false">{t("Faqat kirmaydi")}</option>
          </Select>
          <Select
            value={String(employeeConfigFilters.limit)}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => payrollEmployeesQuery.refetch()} disabled={payrollEmployeesState.loading}>
            {t('Yangilash')}
          </Button>
        </div>
      )}
    >
      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {t("Oklad rejimida oylik summa musbat bo'lishi shart. Dars + oklad rejimida ikki qism birga hisoblanadi.")}
      </div>
      {payrollEmployeesState.loading ? (
        <StateView type="skeleton" />
      ) : payrollEmployeesState.error ? (
        <StateView type="error" description={payrollEmployeesState.error} />
      ) : (
        <>
          <DataTable
            columns={payrollEmployeeColumns}
            rows={payrollEmployees}
            density="compact"
            maxHeightClassName="max-h-[500px]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <div>{t('Jami')}: {payrollEmployeesState.total}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={payrollEmployeesState.page <= 1}
                onClick={() =>
                  setEmployeeConfigFilters((prev) => ({ ...prev, page: Math.max(1, payrollEmployeesState.page - 1) }))
                }
              >
                {t('Oldingi')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={payrollEmployeesState.page >= payrollEmployeesState.pages}
                onClick={() =>
                  setEmployeeConfigFilters((prev) => ({ ...prev, page: Math.min(payrollEmployeesState.pages, payrollEmployeesState.page + 1) }))
                }
              >
                {t('Keyingi')}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export function PayrollRatesPanel({
  tab,
  settingsTab,
  isManagerView,
  busy,
  openRateCreateDrawer,
  payrollTeacherRatesQuery,
  loadMoreTeacherRates,
  teacherRatesColumns,
  teacherRates,
  payrollSubjectRatesQuery,
  loadMoreSubjectRates,
  subjectRatesColumns,
  subjectRates,
}) {
  const { t } = useTranslation();

  if (isManagerView || tab !== 'settings' || settingsTab !== 'rates') return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs text-slate-700 xl:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-indigo-200 bg-white px-1.5 text-[11px] font-semibold text-indigo-700">
            1
          </span>
          <span className="font-semibold text-slate-800">{t("O'qituvchi stavkalari")}</span>
          <span className="text-slate-400">{'>'}</span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-700">
            2
          </span>
          <span className="font-semibold text-slate-800">{t('Fan stavkalari')}</span>
        </div>
        <div className="mt-1 text-slate-600">
          {t("Bu stavka fan bo'yicha umumiy stavkadan ustun turadi.")}
        </div>
        <div className="text-slate-600">
          {t("Alohida o'qituvchi stavkasi bo'lmasa, shu fan stavkasi qo'llanadi.")}
        </div>
      </div>

      <Card
        title={t("O'qituvchi stavkalari")}
        subtitle={t("Muayyan o'qituvchi uchun fan kesimida alohida soat narxini belgilang.")}
        actions={(
          <Button size="sm" variant="indigo" onClick={() => openRateCreateDrawer('teacher')} disabled={busy}>
            {t("Yangi o'qituvchi stavkasi")}
          </Button>
        )}
      >
        <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t("Bu stavka fan bo'yicha umumiy stavkadan ustun turadi.")}
        </div>
        <div className="mt-4">
          {payrollTeacherRatesQuery.isLoading ? (
            <StateView type="skeleton" />
          ) : payrollTeacherRatesQuery.error ? (
            <StateView type="error" description={payrollTeacherRatesQuery.error?.message} />
          ) : (
            <>
              {payrollTeacherRatesQuery.partial && (
                <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t("Qisman ma'lumot yuklandi. Hammasi ko'rinmasligi mumkin.")}
                </div>
              )}
              <DataTable columns={teacherRatesColumns} rows={teacherRates} density="compact" maxHeightClassName="max-h-[380px]" />
              {(payrollTeacherRatesQuery.hasMore || payrollTeacherRatesQuery.data?.total > teacherRates.length) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {t('Yuklangan')}: {teacherRates.length} / {payrollTeacherRatesQuery.data?.total || teacherRates.length}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || payrollTeacherRatesQuery.loadingMore}
                    onClick={loadMoreTeacherRates}
                  >
                    {payrollTeacherRatesQuery.loadingMore ? t('Yuklanmoqda...') : t("Ko'proq yuklash")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card
        title={t('Fan stavkalari')}
        subtitle={t("Fanlar bo'yicha standart soat narxlarini boshqaring.")}
        actions={(
          <Button size="sm" variant="indigo" onClick={() => openRateCreateDrawer('subject')} disabled={busy}>
            {t('Yangi fan stavkasi')}
          </Button>
        )}
      >
        <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t("Alohida o'qituvchi stavkasi bo'lmasa, shu fan stavkasi qo'llanadi.")}
        </div>
        <div className="mt-4">
          {payrollSubjectRatesQuery.isLoading ? (
            <StateView type="skeleton" />
          ) : payrollSubjectRatesQuery.error ? (
            <StateView type="error" description={payrollSubjectRatesQuery.error?.message} />
          ) : (
            <>
              {payrollSubjectRatesQuery.partial && (
                <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {t("Qisman ma'lumot yuklandi. Hammasi ko'rinmasligi mumkin.")}
                </div>
              )}
              <DataTable columns={subjectRatesColumns} rows={subjectRates} density="compact" maxHeightClassName="max-h-[380px]" />
              {(payrollSubjectRatesQuery.hasMore || payrollSubjectRatesQuery.data?.total > subjectRates.length) && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {t('Yuklangan')}: {subjectRates.length} / {payrollSubjectRatesQuery.data?.total || subjectRates.length}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy || payrollSubjectRatesQuery.loadingMore}
                    onClick={loadMoreSubjectRates}
                  >
                    {payrollSubjectRatesQuery.loadingMore ? t('Yuklanmoqda...') : t("Ko'proq yuklash")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export function PayrollLessonsPanel({
  tab,
  settingsTab,
  isManagerView,
  isAdminView,
  busy,
  realLessonForm,
  setRealLessonForm,
  onRealLessonEntryModeChange,
  onRealLessonScheduleChange,
  onRealLessonScheduleDateChange,
  onRealLessonTeacherChange,
  onRealLessonSubjectChange,
  onRealLessonStartChange,
  replacementTeacherComboboxOptions,
  realLessonSubjectAutoFilled,
  realLessonLockedBySchedule,
  scheduleLessonComboboxOptions,
  teacherComboboxOptions,
  subjects,
  classrooms,
  handleCreateRealLesson,
  lessonFilters,
  setLessonFilters,
  payrollRealLessonsQuery,
  selectedRealLessonIdsOnPage,
  someRealLessonsPageSelected,
  setSelectedRealLessonIds,
  bulkLessonStatusForm,
  setBulkLessonStatusForm,
  handleBulkLessonStatusUpdate,
  realLessonsColumns,
  realLessons,
}) {
  const { t } = useTranslation();
  const isScheduleMode = realLessonForm.entryMode === 'SCHEDULE';
  const scheduleLockedFields = Boolean(realLessonLockedBySchedule || isScheduleMode);
  const createDisabled =
    !realLessonForm.teacherId ||
    !realLessonForm.subjectId ||
    !realLessonForm.classroomId ||
    !realLessonForm.startAt ||
    !realLessonForm.endAt ||
    (isScheduleMode && (!realLessonForm.darsJadvaliId || !realLessonForm.scheduleDate)) ||
    (realLessonForm.status === 'REPLACED' && !realLessonForm.replacedByTeacherId) ||
    busy;

  if (isManagerView || tab !== 'settings' || settingsTab !== 'lessons') return null;

  return (
    <>
      <Card title={t("O'tilgan dars qo'shish")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label={t('Yaratish rejimi')}>
            <Select
              value={realLessonForm.entryMode || 'MANUAL'}
              onChange={onRealLessonEntryModeChange || ((e) => setRealLessonForm((prev) => ({ ...prev, entryMode: e.target.value })))}
            >
              <option value="MANUAL">{t("Qo'lda")}</option>
              <option value="SCHEDULE">{t('Dars jadvalidan')}</option>
            </Select>
          </Field>
          {isScheduleMode ? (
            <>
              <Field label={t("Dars jadvali yozuvi")}>
                <Combobox
                  value={realLessonForm.darsJadvaliId}
                  onChange={onRealLessonScheduleChange || ((e) => setRealLessonForm((prev) => ({ ...prev, darsJadvaliId: e.target.value })))}
                  placeholder={t('Tanlang')}
                  noOptionsText={t("Ma'lumot topilmadi")}
                  options={scheduleLessonComboboxOptions || []}
                />
              </Field>
              <Field label={t('Dars sanasi')}>
                <Input
                  type="date"
                  value={realLessonForm.scheduleDate || ''}
                  onChange={onRealLessonScheduleDateChange || ((e) => setRealLessonForm((prev) => ({ ...prev, scheduleDate: e.target.value })))}
                />
              </Field>
            </>
          ) : null}
          <Field label={t("O'qituvchi")}>
            <Combobox
              value={realLessonForm.teacherId}
              onChange={onRealLessonTeacherChange || ((e) => setRealLessonForm((prev) => ({ ...prev, teacherId: e.target.value })))}
              disabled={scheduleLockedFields}
              placeholder={t('Tanlang')}
              noOptionsText={t("O'qituvchi topilmadi")}
              options={teacherComboboxOptions}
            />
          </Field>
          <Field label={t('Fan')}>
            <div className="space-y-1">
              <Select
                value={realLessonForm.subjectId}
                onChange={onRealLessonSubjectChange || ((e) => setRealLessonForm((prev) => ({ ...prev, subjectId: e.target.value })))}
                disabled={scheduleLockedFields}
              >
                <option value="">{t('Tanlang')}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </Select>
              {realLessonSubjectAutoFilled ? (
                <p className="text-[11px] text-emerald-700">
                  {t("Fan o'qituvchidan avtomatik tanlandi (xohlasangiz o'zgartirishingiz mumkin).")}
                </p>
              ) : null}
            </div>
          </Field>
          <Field label={t('Sinf')}>
            <Select
              value={realLessonForm.classroomId}
              onChange={(e) => setRealLessonForm((prev) => ({ ...prev, classroomId: e.target.value }))}
              disabled={scheduleLockedFields}
            >
              <option value="">{t('Tanlang')}</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.academicYear})</option>
              ))}
            </Select>
          </Field>
          <Field label={t('Holat')}>
            <Select value={realLessonForm.status} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="DONE">{getLessonStatusLabel('DONE', t)}</option>
              <option value="CANCELED">{getLessonStatusLabel('CANCELED', t)}</option>
              <option value="REPLACED">{getLessonStatusLabel('REPLACED', t)}</option>
            </Select>
          </Field>
          <Field label={t('Boshlanish')}>
            <Input
              type="datetime-local"
              value={realLessonForm.startAt}
              onChange={onRealLessonStartChange || ((e) => setRealLessonForm((prev) => ({ ...prev, startAt: e.target.value })))}
              disabled={scheduleLockedFields}
            />
          </Field>
          <Field label={t('Tugash')}>
            <Input
              type="datetime-local"
              value={realLessonForm.endAt}
              onChange={(e) => setRealLessonForm((prev) => ({ ...prev, endAt: e.target.value }))}
              disabled={scheduleLockedFields}
            />
          </Field>
          <Field label={t('Daqiqa (ixtiyoriy)')}>
            <Input type="number" value={realLessonForm.durationMinutes} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, durationMinutes: e.target.value }))} />
          </Field>
          <Field label={t("O'rinbosar o'qituvchi")}>
            <Combobox
              value={realLessonForm.replacedByTeacherId}
              onChange={(e) => setRealLessonForm((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
              disabled={realLessonForm.status !== 'REPLACED'}
              placeholder={t('Tanlang')}
              noOptionsText={t("O'qituvchi topilmadi")}
              options={replacementTeacherComboboxOptions || teacherComboboxOptions}
            />
          </Field>
        </div>
        {isScheduleMode && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {t("Jadval rejimi: o'qituvchi, fan, sinf va vaqt tanlangan jadvaldan avtomatik olinadi.")}
          </div>
        )}
        {realLessonForm.status === 'REPLACED' && (
          <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
            {t("Almashtirilgan: dars soati o'rinbosar o'qituvchiga yoziladi.")}
          </div>
        )}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Textarea
            rows={2}
            value={realLessonForm.note}
            onChange={(e) => setRealLessonForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder={t('Izoh')}
          />
          <Button
            variant="indigo"
            disabled={createDisabled}
            onClick={handleCreateRealLesson}
          >
            {t("O'tilgan dars qo'shish")}
          </Button>
        </div>
      </Card>

      <Card
        title={t("O'tilgan darslar ro'yxati")}
        actions={(
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input type="month" value={lessonFilters.periodMonth} onChange={(e) => setLessonFilters((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))} />
            <Select value={lessonFilters.status} onChange={(e) => setLessonFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}>
              <option value="">{t('Barcha holat')}</option>
              <option value="DONE">{getLessonStatusLabel('DONE', t)}</option>
              <option value="CANCELED">{getLessonStatusLabel('CANCELED', t)}</option>
              <option value="REPLACED">{getLessonStatusLabel('REPLACED', t)}</option>
            </Select>
            <Combobox
              value={lessonFilters.teacherId}
              onChange={(e) => setLessonFilters((prev) => ({ ...prev, teacherId: e.target.value, page: 1 }))}
              placeholder={t("Barcha o'qituvchi")}
              noOptionsText={t("O'qituvchi topilmadi")}
              options={teacherComboboxOptions}
            />
            <Select value={lessonFilters.subjectId} onChange={(e) => setLessonFilters((prev) => ({ ...prev, subjectId: e.target.value, page: 1 }))}>
              <option value="">{t('Barcha fan')}</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </Select>
            <Select value={lessonFilters.classroomId} onChange={(e) => setLessonFilters((prev) => ({ ...prev, classroomId: e.target.value, page: 1 }))}>
              <option value="">{t('Barcha sinf')}</option>
              {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
            </Select>
            <Button variant="secondary" onClick={() => payrollRealLessonsQuery.refetch()}>
              {t('Yangilash')}
            </Button>
          </div>
        )}
      >
        {isAdminView && (
          <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-700">
                {t('Tanlangan darslar')}: <span className="font-semibold text-slate-900">{selectedRealLessonIdsOnPage.length}</span>
                {someRealLessonsPageSelected ? (
                  <span className="ml-2 text-xs text-slate-500">{t("(joriy sahifadan qisman)")}</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedRealLessonIdsOnPage.length || busy}
                  onClick={() => setSelectedRealLessonIds([])}
                >
                  {t('Tanlovni tozalash')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <Select
                value={bulkLessonStatusForm.status}
                onChange={(e) =>
                  setBulkLessonStatusForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                    replacedByTeacherId: e.target.value === 'REPLACED' ? prev.replacedByTeacherId : '',
                  }))
                }
                disabled={busy}
              >
                <option value="DONE">{getLessonStatusLabel('DONE', t)}</option>
                <option value="CANCELED">{getLessonStatusLabel('CANCELED', t)}</option>
                <option value="REPLACED">{getLessonStatusLabel('REPLACED', t)}</option>
              </Select>
              <Combobox
                value={bulkLessonStatusForm.replacedByTeacherId}
                onChange={(e) => setBulkLessonStatusForm((prev) => ({ ...prev, replacedByTeacherId: e.target.value }))}
                disabled={busy || bulkLessonStatusForm.status !== 'REPLACED'}
                placeholder={t("O'rinbosar o'qituvchi")}
                noOptionsText={t("O'qituvchi topilmadi")}
                options={teacherComboboxOptions}
              />
              <Input
                value={bulkLessonStatusForm.note}
                onChange={(e) => setBulkLessonStatusForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder={t('Izoh (ixtiyoriy)')}
                disabled={busy}
              />
              <Button
                variant="indigo"
                disabled={
                  busy ||
                  !selectedRealLessonIdsOnPage.length ||
                  (bulkLessonStatusForm.status === 'REPLACED' && !bulkLessonStatusForm.replacedByTeacherId)
                }
                onClick={handleBulkLessonStatusUpdate}
              >
                {t("Ommaviy holatni qo'llash")}
              </Button>
            </div>
          </div>
        )}
        {payrollRealLessonsQuery.isLoading || payrollRealLessonsQuery.isFetching ? (
          <StateView type="skeleton" />
        ) : payrollRealLessonsQuery.error ? (
          <StateView type="error" description={payrollRealLessonsQuery.error?.message} />
        ) : (
          <>
            <DataTable columns={realLessonsColumns} rows={realLessons} density="compact" maxHeightClassName="max-h-[420px]" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>{t('Jami')}: {payrollRealLessonsQuery.data?.total || 0}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(payrollRealLessonsQuery.data?.page || 1) <= 1}
                  onClick={() => setLessonFilters((prev) => ({ ...prev, page: Math.max(1, (payrollRealLessonsQuery.data?.page || 1) - 1) }))}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(payrollRealLessonsQuery.data?.page || 1) >= (payrollRealLessonsQuery.data?.pages || 1)}
                  onClick={() => setLessonFilters((prev) => ({ ...prev, page: Math.min((payrollRealLessonsQuery.data?.pages || 1), (payrollRealLessonsQuery.data?.page || 1) + 1) }))}
                >
                  {t('Keyingi')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function PayrollAdvancesPanel({
  tab,
  settingsTab,
  isManagerView,
  busy,
  advanceForm,
  setAdvanceForm,
  teacherComboboxOptions,
  handleCreateAdvance,
  advanceFilters,
  setAdvanceFilters,
  payrollAdvancesQuery,
  advancesState,
  advanceColumns,
  advances,
}) {
  const { t } = useTranslation();

  if (isManagerView || tab !== 'settings' || settingsTab !== 'advances') return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card
        title={t("Avans qo'shish")}
        subtitle={t("Oy davomida berilgan avansni kiriting. Hisoblash paytida bu summa ushlanadi.")}
        className="xl:col-span-1"
      >
        <div className="space-y-3">
          <Field label={t('Oy')}>
            <Input
              type="month"
              value={advanceForm.periodMonth}
              onChange={(e) => setAdvanceForm((prev) => ({ ...prev, periodMonth: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Field label={t("O'qituvchi")}>
            <Combobox
              value={advanceForm.teacherId}
              onChange={(e) => setAdvanceForm((prev) => ({ ...prev, teacherId: e.target.value }))}
              placeholder={t('Tanlang')}
              noOptionsText={t("O'qituvchi topilmadi")}
              options={teacherComboboxOptions}
              disabled={busy}
            />
          </Field>
          <Field label={t('Avans summasi')}>
            <MoneyInputUz
              value={advanceForm.amount}
              onValueChange={(raw) => setAdvanceForm((prev) => ({ ...prev, amount: raw }))}
              disabled={busy}
            />
          </Field>
          <Field label={t('Berilgan sana (ixtiyoriy)')}>
            <Input
              type="datetime-local"
              value={advanceForm.paidAt}
              onChange={(e) => setAdvanceForm((prev) => ({ ...prev, paidAt: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Field label={t('Izoh')}>
            <Textarea
              rows={3}
              value={advanceForm.note}
              onChange={(e) => setAdvanceForm((prev) => ({ ...prev, note: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Button
            className="w-full"
            variant="indigo"
            onClick={handleCreateAdvance}
            disabled={!advanceForm.periodMonth || !advanceForm.teacherId || !advanceForm.amount || busy}
          >
            {t("Avans qo'shish")}
          </Button>
        </div>
      </Card>

      <Card
        title={t("Avans to'lovlar ro'yxati")}
        className="xl:col-span-2"
        actions={(
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input
              type="month"
              value={advanceFilters.periodMonth}
              onChange={(e) => setAdvanceFilters((prev) => ({ ...prev, periodMonth: e.target.value, page: 1 }))}
            />
            <Select
              value={String(advanceFilters.limit)}
              onChange={(e) => setAdvanceFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => payrollAdvancesQuery.refetch()} disabled={advancesState.loading}>
              {t('Yangilash')}
            </Button>
          </div>
        )}
      >
        {advancesState.loading ? (
          <StateView type="skeleton" />
        ) : advancesState.error ? (
          <StateView type="error" description={advancesState.error} />
        ) : (
          <>
            <DataTable columns={advanceColumns} rows={advances} density="compact" maxHeightClassName="max-h-[460px]" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>{t('Jami')}: {advancesState.total}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={advancesState.page <= 1}
                  onClick={() => setAdvanceFilters((prev) => ({ ...prev, page: Math.max(1, advancesState.page - 1) }))}
                >
                  {t('Oldingi')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={advancesState.page >= advancesState.pages}
                  onClick={() => setAdvanceFilters((prev) => ({ ...prev, page: Math.min(advancesState.pages, advancesState.page + 1) }))}
                >
                  {t('Keyingi')}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
