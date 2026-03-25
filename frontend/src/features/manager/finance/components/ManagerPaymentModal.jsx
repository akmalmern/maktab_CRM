import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  Modal,
  StateView,
  StatusBadge,
} from '../../../../components/ui';
import { FinanceImtiyozSection } from '../../../shared/finance/components/FinanceImtiyozSection';
import { FinanceLedgerTimelineCard } from '../../../shared/finance/components/FinanceLedgerTimelineCard';
import { FinancePaymentFormSection } from '../../../shared/finance/components/FinancePaymentFormSection';
import { FinancePaymentPreviewCard } from '../../../shared/finance/components/FinancePaymentPreviewCard';
import { FinanceTransactionsTable } from '../../../shared/finance/components/FinanceTransactionsTable';
import {
  dateInputValueToMonthKey,
  formatDateTime,
  formatMoney,
  formatMonthKey,
  monthKeyToDateInputValue,
  resolveLocale,
  sumFormat,
} from '../managerDebtorsModel';
import { MonthChips } from './MonthChips';

export function ManagerPaymentModal({
  open,
  onClose,
  paymentStudent,
  paymentModalTab,
  setPaymentModalTab,
  paymentState,
  paymentForm,
  setPaymentForm,
  imtiyozForm,
  setImtiyozForm,
  paymentActionLoading,
  mergedPaymentPreview,
  serverPreviewState,
  onSubmitPayment,
  onCreateImtiyoz,
  onDeactivateImtiyoz,
  onRevertPayment,
  onFillAllDebt,
  paymentTypeLabel,
  imtiyozTypeLabel,
  firstDebtMonth,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  return (
    <Modal open={open} onClose={onClose} title={t("Student to'lovini belgilash")} maxWidth="max-w-5xl">
      {!paymentStudent ? (
        <StateView type="empty" description={t("O'quvchi tanlanmagan.")} />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm shadow-sm ring-1 ring-slate-200/50">
            <p className="font-semibold text-slate-900">{paymentStudent.fullName}</p>
            <p className="mt-1 text-slate-600">
              {t('Qarzdor oylar')}: {paymentStudent.qarzOylarSoni || 0} {t('ta')}
            </p>
            <div className="mt-2">
              <MonthChips
                items={(paymentStudent.qarzOylar || []).map((key) => formatMonthKey(key, locale))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 ring-1 ring-slate-200/50">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={paymentModalTab === 'payment' ? 'indigo' : 'secondary'}
                onClick={() => setPaymentModalTab('payment')}
              >
                {t("To'lov")}
              </Button>
              <Button
                size="sm"
                variant={paymentModalTab === 'imtiyoz' ? 'indigo' : 'secondary'}
                onClick={() => setPaymentModalTab('imtiyoz')}
              >
                {t('Imtiyoz')}
                {!!paymentState.imtiyozlar?.length && ` (${paymentState.imtiyozlar.length})`}
              </Button>
              <Button
                size="sm"
                variant={paymentModalTab === 'history' ? 'indigo' : 'secondary'}
                onClick={() => setPaymentModalTab('history')}
              >
                {t('Tarix')}
                {!!paymentState.transactions?.length && ` (${paymentState.transactions.length})`}
              </Button>
            </div>
          </div>

          {paymentModalTab === 'payment' && (
            <div className="space-y-4">
              <FinancePaymentFormSection
                paymentForm={paymentForm}
                setPaymentForm={setPaymentForm}
                onSubmit={onSubmitPayment}
                onClose={onClose}
                submitDisabled={
                  paymentActionLoading ||
                  paymentState.loading ||
                  !mergedPaymentPreview?.valid ||
                  !mergedPaymentPreview?.previewMonthsCount
                }
                paymentTypeLabel={paymentTypeLabel}
                monthKeyToDateInputValue={monthKeyToDateInputValue}
                dateInputValueToMonthKey={dateInputValueToMonthKey}
                formatMonthKey={(value) => formatMonthKey(value, locale)}
                quickActionDescription={
                  Number(paymentStudent.qarzOylarSoni || 0) > 0
                    ? `${t('Qarzdor oylar')}: ${paymentStudent.qarzOylarSoni} ${t('ta')} (${formatMonthKey(firstDebtMonth(paymentStudent), locale)}dan boshlab)`
                    : t("Qarzdor oylar topilmadi")
                }
                quickActionDisabled={
                  paymentActionLoading || Number(paymentStudent.qarzOylarSoni || 0) < 1
                }
                onQuickAction={onFillAllDebt}
              >
                <FinancePaymentPreviewCard
                  paymentPreview={mergedPaymentPreview}
                  paymentForm={paymentForm}
                  paymentTypeLabel={paymentTypeLabel}
                  formatMonthKey={(value) => formatMonthKey(value, locale)}
                  sumFormat={(value) => sumFormat(value, locale)}
                  stateType={paymentState.loading ? 'loading' : 'empty'}
                  stateDescription={
                    paymentState.loading ? t("To'lov ma'lumotlari olinmoqda") : t('Preview mavjud emas')
                  }
                  serverPreviewLoading={serverPreviewState.loading}
                  serverPreviewError={serverPreviewState.error}
                  mode="manager"
                  monthChipTone="danger"
                />
              </FinancePaymentFormSection>
            </div>
          )}

          {paymentModalTab === 'imtiyoz' && (
            <FinanceImtiyozSection
              actionLoading={paymentActionLoading}
              imtiyozForm={imtiyozForm}
              setImtiyozForm={setImtiyozForm}
              onSubmit={onCreateImtiyoz}
              detailImtiyozlar={paymentState.imtiyozlar || []}
              onDeactivate={onDeactivateImtiyoz}
              monthKeyToDateInputValue={monthKeyToDateInputValue}
              dateInputValueToMonthKey={dateInputValueToMonthKey}
              formatMonthKey={(value) => formatMonthKey(value, locale)}
              imtiyozTypeLabel={imtiyozTypeLabel}
              sumFormat={(value) => sumFormat(value, locale)}
            />
          )}

          {paymentModalTab === 'history' && (
            <div className="space-y-4">
              <FinanceTransactionsTable
                transactions={paymentState.transactions || []}
                loading={paymentState.loading}
                error={paymentState.error}
                actionLoading={paymentActionLoading}
                onRevertPayment={onRevertPayment}
                paymentTypeLabel={paymentTypeLabel}
                formatMoney={(value) => formatMoney(value, locale, t)}
                formatDateTime={(value) => formatDateTime(value, locale)}
              />

              <FinanceLedgerTimelineCard
                transactions={paymentState.transactions || []}
                imtiyozlar={paymentState.imtiyozlar || []}
                actionLoading={paymentActionLoading}
                onRevertPayment={onRevertPayment}
                paymentTypeLabel={paymentTypeLabel}
                imtiyozTypeLabel={imtiyozTypeLabel}
                sumFormat={(value) => sumFormat(value, locale)}
                formatMonthKey={(value) => formatMonthKey(value, locale)}
                formatDateTime={(value) => formatDateTime(value, locale)}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
