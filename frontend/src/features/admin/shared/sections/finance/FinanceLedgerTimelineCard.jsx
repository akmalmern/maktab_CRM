import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FinanceLedgerTimelineCard as SharedFinanceLedgerTimelineCard } from '../../../../shared/finance/components/FinanceLedgerTimelineCard';
import {
  formatDateTimeLocale,
  formatMonthKey,
  imtiyozTypeLabel,
  paymentTypeLabel,
  resolveLocale,
  sumFormat,
} from './financeSectionModel';

export default function FinanceLedgerTimelineCard({
  detailState,
  detailImtiyozlar,
  actionLoading,
  onRevertPayment,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const paymentTypeLabelRenderer = useMemo(() => (type) => paymentTypeLabel(type, t), [t]);
  const imtiyozTypeLabelRenderer = useMemo(() => (type) => imtiyozTypeLabel(type, t), [t]);
  const sumFormatRenderer = useMemo(() => (value) => sumFormat(value, locale), [locale]);
  const formatMonthKeyRenderer = useMemo(
    () => (value) => formatMonthKey(value, locale),
    [locale],
  );
  const formatDateTimeRenderer = useMemo(
    () => (value) => formatDateTimeLocale(value, locale),
    [locale],
  );

  return (
    <SharedFinanceLedgerTimelineCard
      transactions={detailState.transactions || []}
      imtiyozlar={detailImtiyozlar || []}
      actionLoading={actionLoading}
      onRevertPayment={onRevertPayment}
      paymentTypeLabel={paymentTypeLabelRenderer}
      imtiyozTypeLabel={imtiyozTypeLabelRenderer}
      sumFormat={sumFormatRenderer}
      formatMonthKey={formatMonthKeyRenderer}
      formatDateTime={formatDateTimeRenderer}
    />
  );
}
