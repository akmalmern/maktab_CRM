import { useTranslation } from 'react-i18next';
import { Button, Card, Select, Textarea } from '../../../../../components/ui';
import { getPaymentMethodLabel } from './payrollRunLabels';
import { Field, StatusPill } from './payrollUi';

export default function PayrollRunActionsCard({
  selectedRun,
  selectedRunTeacherCount,
  isAdminView,
  isManagerView,
  busy,
  payForm,
  setPayForm,
  canPaySelectedRun,
  runPrimaryAction,
  canReverseSelectedRun,
  reverseReason,
  setReverseReason,
  handleReverseRun,
}) {
  const { t } = useTranslation();

  return (
    <Card title={t('Asosiy amal')} className="xl:col-span-1">
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>{t("Hisob-kitob holati")}</span>
            <StatusPill value={selectedRun.status} />
          </div>
          <div className="mt-2">{t("O'qituvchilar")}: {selectedRunTeacherCount || 0}</div>
        </div>

        {isAdminView && selectedRun.status === 'APPROVED' && (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <Field label={t("To'lov usuli")}>
              <Select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                disabled={!canPaySelectedRun || busy}
              >
                <option value="BANK">{getPaymentMethodLabel('BANK', t)}</option>
                <option value="CASH">{getPaymentMethodLabel('CASH', t)}</option>
                <option value="CLICK">{getPaymentMethodLabel('CLICK', t)}</option>
                <option value="PAYME">{getPaymentMethodLabel('PAYME', t)}</option>
              </Select>
            </Field>
          </div>
        )}

        {runPrimaryAction ? (
          <Button
            className="w-full"
            variant={runPrimaryAction.variant}
            onClick={runPrimaryAction.onClick}
            disabled={runPrimaryAction.disabled}
          >
            {runPrimaryAction.label}
          </Button>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {t("Bu holatda asosiy amal mavjud emas")}
          </div>
        )}

        {!isManagerView && canReverseSelectedRun && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3">
            <Field label={t('Bekor qilish sababi')}>
              <Textarea
                rows={2}
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                disabled={!canReverseSelectedRun || busy}
              />
            </Field>
            <Button
              className="w-full"
              variant="danger"
              disabled={!canReverseSelectedRun || !reverseReason.trim() || busy}
              onClick={handleReverseRun}
            >
              {t('Bekor qilish')}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
