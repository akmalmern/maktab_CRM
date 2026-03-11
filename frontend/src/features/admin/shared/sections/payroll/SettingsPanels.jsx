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
      title={t('Sozlamalar')}
      subtitle={t("Kam ishlatiladigan bo'limlar shu yerga yig'ilgan")}
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
            <option value="TEACHER">TEACHER</option>
            <option value="STAFF">STAFF</option>
          </Select>
          <Select
            value={employeeConfigFilters.payrollMode}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, payrollMode: e.target.value, page: 1 }))}
          >
            <option value="">{t('Barcha mode')}</option>
            <option value="LESSON_BASED">LESSON_BASED</option>
            <option value="FIXED">FIXED</option>
            <option value="MIXED">MIXED</option>
            <option value="MANUAL_ONLY">MANUAL_ONLY</option>
          </Select>
          <Select
            value={employeeConfigFilters.employmentStatus}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, employmentStatus: e.target.value, page: 1 }))}
          >
            <option value="">{t('Barcha bandlik')}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </Select>
          <Select
            value={employeeConfigFilters.isPayrollEligible}
            onChange={(e) => setEmployeeConfigFilters((prev) => ({ ...prev, isPayrollEligible: e.target.value, page: 1 }))}
          >
            <option value="">{t('Eligibility (hammasi)')}</option>
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
        {t("FIXED rejimda oklad summasi musbat bo'lishi shart. MIXED rejimda dars + oklad birga hisoblanadi.")}
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
  teacherRatesColumns,
  teacherRates,
  payrollSubjectRatesQuery,
  subjectRatesColumns,
  subjectRates,
}) {
  const { t } = useTranslation();

  if (isManagerView || tab !== 'settings' || settingsTab !== 'rates') return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
            <DataTable columns={teacherRatesColumns} rows={teacherRates} density="compact" maxHeightClassName="max-h-[380px]" />
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
            <DataTable columns={subjectRatesColumns} rows={subjectRates} density="compact" maxHeightClassName="max-h-[380px]" />
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

  if (isManagerView || tab !== 'settings' || settingsTab !== 'lessons') return null;

  return (
    <>
      <Card title={t("O'tilgan dars qo'shish")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label={t("O'qituvchi")}>
            <Combobox
              value={realLessonForm.teacherId}
              onChange={(e) => setRealLessonForm((prev) => ({ ...prev, teacherId: e.target.value }))}
              placeholder={t('Tanlang')}
              noOptionsText={t("O'qituvchi topilmadi")}
              options={teacherComboboxOptions}
            />
          </Field>
          <Field label={t('Fan')}>
            <Select value={realLessonForm.subjectId} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, subjectId: e.target.value }))}>
              <option value="">{t('Tanlang')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('Sinf')}>
            <Select value={realLessonForm.classroomId} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, classroomId: e.target.value }))}>
              <option value="">{t('Tanlang')}</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name} ({classroom.academicYear})</option>
              ))}
            </Select>
          </Field>
          <Field label={t('Status')}>
            <Select value={realLessonForm.status} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="DONE">DONE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="REPLACED">REPLACED</option>
            </Select>
          </Field>
          <Field label={t('Boshlanish')}>
            <Input type="datetime-local" value={realLessonForm.startAt} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, startAt: e.target.value }))} />
          </Field>
          <Field label={t('Tugash')}>
            <Input type="datetime-local" value={realLessonForm.endAt} onChange={(e) => setRealLessonForm((prev) => ({ ...prev, endAt: e.target.value }))} />
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
              options={teacherComboboxOptions}
            />
          </Field>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <Textarea
            rows={2}
            value={realLessonForm.note}
            onChange={(e) => setRealLessonForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder={t('Izoh')}
          />
          <Button
            variant="indigo"
            disabled={!realLessonForm.teacherId || !realLessonForm.subjectId || !realLessonForm.classroomId || !realLessonForm.startAt || !realLessonForm.endAt || (realLessonForm.status === 'REPLACED' && !realLessonForm.replacedByTeacherId) || busy}
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
              <option value="">{t('Barcha status')}</option>
              <option value="DONE">DONE</option>
              <option value="CANCELED">CANCELED</option>
              <option value="REPLACED">REPLACED</option>
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
                <option value="DONE">DONE</option>
                <option value="CANCELED">CANCELED</option>
                <option value="REPLACED">REPLACED</option>
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
                {t("Bulk status qo'llash")}
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
        subtitle={t("Oy davomida berilgan avansni kiriting. Generate vaqtida bu summa ushlanadi.")}
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
