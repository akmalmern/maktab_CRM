import { Modal, StateView } from '../../../../../components/ui';
import FinancePaymentHistoryTab from './FinancePaymentHistoryTab';
import FinancePaymentStudentSummary from './FinancePaymentStudentSummary';
import FinancePaymentTabs from './FinancePaymentTabs';
import ImtiyozFormCard from './FinanceImtiyozFormCard';
import PaymentFormCard from './FinancePaymentFormCard';

export default function FinancePaymentModal({
  t,
  modalOpen,
  setModalOpen,
  selectedStudentId,
  detailState,
  detailStudent,
  detailImtiyozlar,
  paymentModalTab,
  setPaymentModalTab,
  actionLoading,
  onRollbackTarif,
  settingsMeta,
  onRevertPayment,
  paymentForm,
  setPaymentForm,
  handleCreatePayment,
  isSelectedDetailReady,
  paymentPreview,
  serverPreviewLoading,
  serverPreviewError,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  handleDeactivateImtiyoz,
  MonthChips,
  formatMonthKey,
  sumFormat,
  locale,
}) {
  return (
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("Student to'lovini belgilash")} maxWidth="max-w-3xl">
      {!selectedStudentId ? (
        <StateView type="empty" description={t('Student tanlanmagan')} />
      ) : (
        <div className="space-y-4">
          {detailState.loading ? (
            <StateView type="loading" />
          ) : detailState.error ? (
            <StateView type="error" description={detailState.error} />
          ) : (
            <>
              <FinancePaymentStudentSummary
                t={t}
                detailStudent={detailStudent}
                MonthChips={MonthChips}
                formatMonthKey={formatMonthKey}
              />

              <FinancePaymentTabs
                t={t}
                paymentModalTab={paymentModalTab}
                setPaymentModalTab={setPaymentModalTab}
                detailImtiyozlar={detailImtiyozlar}
                detailState={detailState}
              />

              {paymentModalTab === 'payment' && (
                <PaymentFormCard
                  actionLoading={actionLoading}
                  detailState={detailState}
                  selectedStudentId={selectedStudentId}
                  isSelectedDetailReady={isSelectedDetailReady}
                  paymentForm={paymentForm}
                  setPaymentForm={setPaymentForm}
                  handleCreatePayment={handleCreatePayment}
                  setModalOpen={setModalOpen}
                  paymentPreview={paymentPreview}
                  serverPreviewLoading={serverPreviewLoading}
                  serverPreviewError={serverPreviewError}
                />
              )}

              {paymentModalTab === 'imtiyoz' && (
                <ImtiyozFormCard
                  actionLoading={actionLoading}
                  imtiyozForm={imtiyozForm}
                  setImtiyozForm={setImtiyozForm}
                  handleCreateImtiyoz={handleCreateImtiyoz}
                  detailImtiyozlar={detailImtiyozlar}
                  handleDeactivateImtiyoz={handleDeactivateImtiyoz}
                />
              )}

              {paymentModalTab === 'history' && (
                <FinancePaymentHistoryTab
                  t={t}
                  locale={locale}
                  actionLoading={actionLoading}
                  settingsMeta={settingsMeta}
                  onRollbackTarif={onRollbackTarif}
                  detailState={detailState}
                  detailImtiyozlar={detailImtiyozlar}
                  onRevertPayment={onRevertPayment}
                  sumFormat={sumFormat}
                />
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
