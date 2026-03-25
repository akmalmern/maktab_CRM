import { useTranslation } from 'react-i18next';
import { FinancePaymentPreviewCard as SharedFinancePaymentPreviewCard } from '../../../../shared/finance/components/FinancePaymentPreviewCard';
import { formatMonthKey, paymentTypeLabel, resolveLocale, sumFormat } from './financeSectionModel';

export default function FinancePaymentPreviewCard({
  paymentPreview,
  paymentForm,
  detailState,
  selectedStudentId,
  isSelectedDetailReady,
  serverPreviewLoading,
  serverPreviewError,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const stateType =
    detailState.loading || (selectedStudentId && !isSelectedDetailReady) ? 'loading' : 'empty';
  const stateDescription =
    detailState.loading || (selectedStudentId && !isSelectedDetailReady)
      ? t("Student to'lov ma'lumoti yuklanmoqda")
      : t('Preview mavjud emas');

  return (
    <SharedFinancePaymentPreviewCard
      paymentPreview={paymentPreview}
      paymentForm={paymentForm}
      paymentTypeLabel={(type) => paymentTypeLabel(type, t)}
      formatMonthKey={(value) => formatMonthKey(value, locale)}
      sumFormat={(value) => sumFormat(value, locale)}
      stateType={stateType}
      stateDescription={stateDescription}
      serverPreviewLoading={serverPreviewLoading}
      serverPreviewError={serverPreviewError}
      mode="admin"
      monthChipTone="neutral"
    />
  );
}
