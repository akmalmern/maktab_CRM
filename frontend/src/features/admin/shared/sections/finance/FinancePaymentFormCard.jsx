import { useTranslation } from 'react-i18next';
import { FinancePaymentFormSection } from '../../../../shared/finance/components/FinancePaymentFormSection';
import { dateInputValueToMonthKey, formatMonthKey, monthKeyToDateInputValue, paymentTypeLabel, resolveLocale } from './financeSectionModel';
import FinancePaymentPreviewCard from './FinancePaymentPreviewCard';
import {
  buildFinanceFillAllDebtsPatch,
  buildFinancePaymentQuickActionState,
  isFinancePaymentSubmitDisabled,
} from './financePaymentFormModel';

export default function FinancePaymentFormCard({
  actionLoading,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  setModalOpen,
  paymentPreview,
  serverPreviewLoading,
  serverPreviewError,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const detailStudent = isSelectedDetailReady ? detailState.student : null;
  const quickActionState = buildFinancePaymentQuickActionState({
    detailStudent,
    formatMonthKey: (value) => formatMonthKey(value, locale),
    t,
  });

  function handleFillAllDebts() {
    const nextPatch = buildFinanceFillAllDebtsPatch(quickActionState);
    if (!nextPatch) return;

    setPaymentForm((p) => ({
      ...p,
      ...nextPatch,
    }));
  }

  return (
    <FinancePaymentFormSection
      paymentForm={paymentForm}
      setPaymentForm={setPaymentForm}
      onSubmit={handleCreatePayment}
      onClose={() => setModalOpen(false)}
      submitDisabled={isFinancePaymentSubmitDisabled({
        actionLoading,
        detailStateLoading: detailState.loading,
        selectedStudentId,
        isSelectedDetailReady,
        paymentPreview,
      })}
      paymentTypeLabel={(type) => paymentTypeLabel(type, t)}
      monthKeyToDateInputValue={monthKeyToDateInputValue}
      dateInputValueToMonthKey={dateInputValueToMonthKey}
      formatMonthKey={(value) => formatMonthKey(value, locale)}
      quickActionDescription={quickActionState.quickActionDescription}
      quickActionDisabled={
        actionLoading || detailState.loading || !isSelectedDetailReady || !quickActionState.canFillAllDebts
      }
      onQuickAction={handleFillAllDebts}
    >
      <FinancePaymentPreviewCard
        paymentPreview={paymentPreview}
        paymentForm={paymentForm}
        detailState={detailState}
        selectedStudentId={selectedStudentId}
        isSelectedDetailReady={isSelectedDetailReady}
        serverPreviewLoading={serverPreviewLoading}
        serverPreviewError={serverPreviewError}
      />
    </FinancePaymentFormSection>
  );
}
