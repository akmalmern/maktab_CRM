import {
  Button,
  Combobox,
  Drawer,
  Input,
  Modal,
  MoneyInputUz,
  Select,
  Textarea,
} from '../../../../../components/ui';
import { Field } from './payrollUi';

export function PayrollRateCreateDrawer({
  t,
  open,
  onClose,
  kind,
  busy,
  teacherRateForm,
  setTeacherRateForm,
  subjectRateForm,
  setSubjectRateForm,
  teacherComboboxOptions,
  subjects,
  onCreateTeacherRate,
  onCreateSubjectRate,
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={kind === 'teacher' ? t("Yangi o'qituvchi stavkasi") : t('Yangi fan stavkasi')}
      subtitle={kind === 'teacher'
        ? t("O'qituvchi + fan bo'yicha alohida stavka yarating")
        : t("Fan bo'yicha umumiy standart stavka yarating")}
      widthClassName="max-w-2xl"
    >
      <div className="space-y-4">
        {kind === 'teacher' ? (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t("O'qituvchi")}>
                <Combobox
                  value={teacherRateForm.teacherId}
                  onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                  placeholder={t('Tanlang')}
                  noOptionsText={t("O'qituvchi topilmadi")}
                  options={teacherComboboxOptions}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Fan')}>
                <Select
                  value={teacherRateForm.subjectId}
                  onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">{t('Tanlang')}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Soat narxi')}>
                <MoneyInputUz
                  value={teacherRateForm.ratePerHour}
                  onValueChange={(raw) => setTeacherRateForm((prev) => ({ ...prev, ratePerHour: raw }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Boshlanish sanasi')}>
                <Input
                  type="date"
                  value={teacherRateForm.effectiveFrom}
                  onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Tugash sanasi')}>
                <Input
                  type="date"
                  value={teacherRateForm.effectiveTo}
                  onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Izoh')}>
                <Input
                  value={teacherRateForm.note}
                  onChange={(e) => setTeacherRateForm((prev) => ({ ...prev, note: e.target.value }))}
                  disabled={busy}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="indigo"
                disabled={!teacherRateForm.teacherId || !teacherRateForm.subjectId || !teacherRateForm.ratePerHour || !teacherRateForm.effectiveFrom || busy}
                onClick={onCreateTeacherRate}
              >
                {t("O'qituvchi stavkasi qo'shish")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label={t('Fan')}>
                <Select
                  value={subjectRateForm.subjectId}
                  onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, subjectId: e.target.value }))}
                  disabled={busy}
                >
                  <option value="">{t('Tanlang')}</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t('Soat narxi')}>
                <MoneyInputUz
                  value={subjectRateForm.ratePerHour}
                  onValueChange={(raw) => setSubjectRateForm((prev) => ({ ...prev, ratePerHour: raw }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Boshlanish sanasi')}>
                <Input
                  type="date"
                  value={subjectRateForm.effectiveFrom}
                  onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <Field label={t('Tugash sanasi')}>
                <Input
                  type="date"
                  value={subjectRateForm.effectiveTo}
                  onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, effectiveTo: e.target.value }))}
                  disabled={busy}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label={t('Izoh')}>
                  <Input
                    value={subjectRateForm.note}
                    onChange={(e) => setSubjectRateForm((prev) => ({ ...prev, note: e.target.value }))}
                    disabled={busy}
                  />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={busy}>
                {t('Bekor qilish')}
              </Button>
              <Button
                variant="indigo"
                disabled={!subjectRateForm.subjectId || !subjectRateForm.ratePerHour || !subjectRateForm.effectiveFrom || busy}
                onClick={onCreateSubjectRate}
              >
                {t("Fan stavkasi qo'shish")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

export function PayrollAdjustmentDrawer({
  t,
  open,
  onClose,
  selectedRun,
  adjustmentForm,
  setAdjustmentForm,
  canEditSelectedRun,
  busy,
  selectedRunOwnerOptions,
  onAddAdjustment,
  getPayrollStatusLabel,
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("Qo'lda tuzatma")}
      subtitle={selectedRun?.periodLabel ? t("Tanlangan hisob-kitob: {{period}}", { period: selectedRun.periodLabel }) : t("Hisob-kitobni tanlang")}
      widthClassName="max-w-xl"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{t("Hisob-kitob holati")}:</span> {getPayrollStatusLabel(selectedRun?.status, t)}
        </div>
        <Field label={t("O'qituvchi")}>
          <Combobox
            value={adjustmentForm.ownerKey}
            onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, ownerKey: e.target.value }))}
            disabled={!canEditSelectedRun || busy}
            placeholder={t('Tanlang')}
            noOptionsText={t('Xodim topilmadi')}
            options={selectedRunOwnerOptions}
          />
        </Field>
        <Field label={t('Turi')}>
          <Select
            value={adjustmentForm.type}
            onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, type: e.target.value }))}
            disabled={!canEditSelectedRun || busy}
          >
            <option value="BONUS">{t('Bonus')}</option>
            <option value="PENALTY">{t('Jarima')}</option>
            <option value="MANUAL">{t("Qo'lda")}</option>
          </Select>
        </Field>
        <Field label={t('Summa')}>
          <MoneyInputUz
            value={adjustmentForm.amount}
            onValueChange={(raw) => setAdjustmentForm((prev) => ({ ...prev, amount: raw }))}
            disabled={!canEditSelectedRun || busy}
          />
        </Field>
        <Field label={t('Izoh')}>
          <Textarea
            rows={4}
            value={adjustmentForm.description}
            onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
            disabled={!canEditSelectedRun || busy}
          />
        </Field>
        {!canEditSelectedRun && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("Tuzatma faqat loyiha (DRAFT) holatidagi hisob-kitobga qo'shiladi.")}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </Button>
          <Button
            variant="indigo"
            disabled={!canEditSelectedRun || !adjustmentForm.ownerKey || !adjustmentForm.amount || !adjustmentForm.description.trim() || busy}
            onClick={onAddAdjustment}
          >
            {t("Tuzatma qo'shish")}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

export function PayrollPayItemModal({
  t,
  open,
  onClose,
  payItemModal,
  formatMoney,
  payItemForm,
  setPayItemForm,
  busy,
  onPayItem,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("Xodim bo'yicha to'lov")}
      subtitle={payItemModal.ownerLabel || '-'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{t("To'lanadi")}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatMoney(payItemModal.payableAmount)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{t("To'langan")}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatMoney(payItemModal.paidAmount)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{t('Qoldiq')}</div>
            <div className="mt-1 font-semibold text-slate-900">{formatMoney(Math.max(0, payItemModal.payableAmount - payItemModal.paidAmount))}</div>
          </div>
        </div>
        <Field label={t('Summa')}>
          <MoneyInputUz
            value={payItemForm.amount}
            onValueChange={(raw) => setPayItemForm((prev) => ({ ...prev, amount: raw }))}
            disabled={busy}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t("To'lov usuli")}>
            <Select
              value={payItemForm.paymentMethod}
              onChange={(e) => setPayItemForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              disabled={busy}
            >
              <option value="BANK">{t("Bank o'tkazmasi")}</option>
              <option value="CASH">{t('Naqd pul')}</option>
              <option value="CLICK">{t('Click')}</option>
              <option value="PAYME">{t('Payme')}</option>
            </Select>
          </Field>
          <Field label={t("To'langan sana (ixtiyoriy)")}>
            <Input
              type="datetime-local"
              value={payItemForm.paidAt}
              onChange={(e) => setPayItemForm((prev) => ({ ...prev, paidAt: e.target.value }))}
              disabled={busy}
            />
          </Field>
        </div>
        <Field label={t("Tashqi ID (Ref)")}>
          <Input
            value={payItemForm.externalRef}
            onChange={(e) => setPayItemForm((prev) => ({ ...prev, externalRef: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label={t('Izoh')}>
          <Textarea
            rows={3}
            value={payItemForm.note}
            onChange={(e) => setPayItemForm((prev) => ({ ...prev, note: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </Button>
          <Button
            variant="success"
            onClick={onPayItem}
            disabled={!payItemForm.amount || busy}
          >
            {t("To'lovni tasdiqlash")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PayrollEmployeeConfigModal({
  t,
  open,
  onClose,
  employeeConfigModal,
  setEmployeeConfigModal,
  busy,
  onSave,
  getPayrollStatusLabel,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Oylik sozlamasini tahrirlash')}
      subtitle={employeeConfigModal.displayName || '-'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label={t('Oylik rejimi')}>
            <Select
              value={employeeConfigModal.payrollMode}
              onChange={(e) => setEmployeeConfigModal((prev) => ({ ...prev, payrollMode: e.target.value }))}
              disabled={busy}
            >
              <option value="LESSON_BASED">{getPayrollStatusLabel('LESSON_BASED', t)}</option>
              <option value="FIXED">{getPayrollStatusLabel('FIXED', t)}</option>
              <option value="MIXED">{getPayrollStatusLabel('MIXED', t)}</option>
              <option value="MANUAL_ONLY">{getPayrollStatusLabel('MANUAL_ONLY', t)}</option>
            </Select>
          </Field>
          <Field label={t('Bandlik holati')}>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {getPayrollStatusLabel(employeeConfigModal.employmentStatus, t)}
            </div>
          </Field>
          {['FIXED', 'MIXED'].includes(employeeConfigModal.payrollMode) ? (
            <Field label={t('Oklad')}>
              <MoneyInputUz
                value={employeeConfigModal.fixedSalaryAmount}
                onValueChange={(raw) => setEmployeeConfigModal((prev) => ({ ...prev, fixedSalaryAmount: raw }))}
                disabled={busy}
              />
            </Field>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t("Bu rejimda oklad qo'llanmaydi")}
            </div>
          )}
          {employeeConfigModal.payrollMode !== 'MANUAL_ONLY' ? (
            <Field label={t("Oylikka kiradi")}>
              <Select
                value={employeeConfigModal.isPayrollEligible ? 'true' : 'false'}
                onChange={(e) =>
                  setEmployeeConfigModal((prev) => ({ ...prev, isPayrollEligible: e.target.value === 'true' }))
                }
                disabled={busy}
              >
                <option value="true">{t('Ha')}</option>
                <option value="false">{t("Yo'q")}</option>
              </Select>
            </Field>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {t("Faqat qo'lda rejimda bu xodim uchun to'lovlar avtomatik hisoblanmaydi.")}
            </div>
          )}
        </div>
        <Field label={t('Izoh')}>
          <Textarea
            rows={4}
            value={employeeConfigModal.note}
            onChange={(e) => setEmployeeConfigModal((prev) => ({ ...prev, note: e.target.value }))}
            disabled={busy}
          />
        </Field>
        {['FIXED', 'MIXED'].includes(employeeConfigModal.payrollMode) && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {t("FIXED/MIXED rejimda oklad bo'sh yoki 0 bo'lishi mumkin emas. Okladni tozalash uchun bo'sh qoldiring va boshqa rejimni tanlang.")}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t("Bandlik holati foydalanuvchi (User) faolligidan olinadi va bu oynada qo'lda tahrirlanmaydi.")}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </Button>
          <Button variant="indigo" onClick={onSave} disabled={busy || !employeeConfigModal.employeeId}>
            {t('Saqlash')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PayrollRateEditModal({
  t,
  open,
  onClose,
  rateEditModal,
  setRateEditModal,
  busy,
  teacherComboboxOptions,
  subjects,
  onSave,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rateEditModal.kind === 'teacher' ? t("O'qituvchi stavkasini tahrirlash") : t('Fan stavkasini tahrirlash')}
      subtitle={t("Stavka qiymati va amal qilish muddatini yangilang")}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rateEditModal.kind === 'teacher' && (
            <Field label={t("O'qituvchi")}>
              <Combobox
                value={rateEditModal.teacherId}
                onChange={(e) => setRateEditModal((prev) => ({ ...prev, teacherId: e.target.value }))}
                disabled={busy}
                placeholder={t('Tanlang')}
                noOptionsText={t("O'qituvchi topilmadi")}
                options={teacherComboboxOptions}
              />
            </Field>
          )}
          <Field label={t('Fan')}>
            <Select
              value={rateEditModal.subjectId}
              onChange={(e) => setRateEditModal((prev) => ({ ...prev, subjectId: e.target.value }))}
              disabled={busy}
            >
              <option value="">{t('Tanlang')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('Soat narxi')}>
            <MoneyInputUz
              value={rateEditModal.ratePerHour}
              onValueChange={(raw) => setRateEditModal((prev) => ({ ...prev, ratePerHour: raw }))}
              disabled={busy}
            />
          </Field>
          <Field label={t('Boshlanish sanasi')}>
            <Input
              type="date"
              value={rateEditModal.effectiveFrom}
              onChange={(e) => setRateEditModal((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Field label={t('Tugash sanasi')}>
            <Input
              type="date"
              value={rateEditModal.effectiveTo}
              onChange={(e) => setRateEditModal((prev) => ({ ...prev, effectiveTo: e.target.value }))}
              disabled={busy}
            />
          </Field>
          <Field label={t('Izoh')}>
            <Input
              value={rateEditModal.note}
              onChange={(e) => setRateEditModal((prev) => ({ ...prev, note: e.target.value }))}
              disabled={busy}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </Button>
          <Button
            variant="indigo"
            onClick={onSave}
            disabled={
              busy ||
              !rateEditModal.subjectId ||
              !rateEditModal.ratePerHour ||
              !rateEditModal.effectiveFrom ||
              (rateEditModal.kind === 'teacher' && !rateEditModal.teacherId)
            }
          >
            {t('Saqlash')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
