import FinancePaymentModalView from './FinancePaymentModal';
import { MonthChips } from './financeUiShared';
import {
  formatMonthKey,
  sumFormat,
} from './financeSectionModel';

export default function FinanceDialogsWorkspace({
  t,
  locale,
  modalOpen,
  setModalOpen,
  selectedStudentId,
  detailState,
  detailStudent,
  detailImtiyozlar,
  paymentModalTab,
  setPaymentModalTab,
  actionLoading,
  settingsMeta,
  onRollbackTarif,
  onRevertPayment,
  isSelectedDetailReady,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  paymentPreview,
  serverPreviewState,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  handleDeactivateImtiyoz,
}) {
  return (
    <FinancePaymentModalView
      t={t}
      modalOpen={modalOpen}
      setModalOpen={setModalOpen}
      selectedStudentId={selectedStudentId}
      detailState={detailState}
      detailStudent={detailStudent}
      detailImtiyozlar={detailImtiyozlar}
      paymentModalTab={paymentModalTab}
      setPaymentModalTab={setPaymentModalTab}
      actionLoading={actionLoading}
      settingsMeta={settingsMeta}
      onRollbackTarif={onRollbackTarif}
      onRevertPayment={onRevertPayment}
      isSelectedDetailReady={isSelectedDetailReady}
      paymentForm={paymentForm}
      setPaymentForm={setPaymentForm}
      handleCreatePayment={handleCreatePayment}
      paymentPreview={paymentPreview}
      serverPreviewLoading={serverPreviewState.loading}
      serverPreviewError={serverPreviewState.error || null}
      imtiyozForm={imtiyozForm}
      setImtiyozForm={setImtiyozForm}
      handleCreateImtiyoz={handleCreateImtiyoz}
      handleDeactivateImtiyoz={handleDeactivateImtiyoz}
      MonthChips={MonthChips}
      formatMonthKey={(value) => formatMonthKey(value, locale)}
      sumFormat={(value) => sumFormat(value, locale)}
      locale={locale}
    />
  );
}
