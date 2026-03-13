import { useTranslation } from 'react-i18next';
import { getRunStatusLabel } from './payrollRunLabels';
import { StatWidget } from './payrollUi';

export default function PayrollRunSummaryGrid({
  selectedRun,
  formatMoney,
  selectedRunPayableAmount,
  selectedRunPaidAmount,
  selectedRunRemainingAmount,
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatWidget
        label={t("To'lanadi")}
        value={formatMoney(selectedRunPayableAmount)}
        tone="indigo"
        subtitle={`${selectedRun.periodMonth} | ${getRunStatusLabel(selectedRun.status, t)}`}
      />
      <StatWidget
        label={t("To'langan")}
        value={formatMoney(selectedRunPaidAmount)}
        tone="emerald"
        subtitle={t("Xodimlar bo'yicha to'lov yig'indisi")}
      />
      <StatWidget
        label={t('Qoldiq')}
        value={formatMoney(selectedRunRemainingAmount)}
        tone={selectedRunRemainingAmount > 0 ? 'amber' : 'slate'}
        subtitle={t("To'lanishi kerak qolgan summa")}
      />
    </div>
  );
}
