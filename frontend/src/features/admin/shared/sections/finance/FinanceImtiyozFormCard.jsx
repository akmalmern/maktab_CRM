import { useTranslation } from 'react-i18next';
import { FinanceImtiyozSection } from '../../../../shared/finance/components/FinanceImtiyozSection';
import {
  dateInputValueToMonthKey,
  formatMonthKey,
  imtiyozTypeLabel,
  monthKeyToDateInputValue,
  resolveLocale,
  sumFormat,
} from './financeSectionModel';

export default function FinanceImtiyozFormCard({
  actionLoading,
  imtiyozForm,
  setImtiyozForm,
  handleCreateImtiyoz,
  detailImtiyozlar,
  handleDeactivateImtiyoz,
}) {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  return (
    <FinanceImtiyozSection
      actionLoading={actionLoading}
      imtiyozForm={imtiyozForm}
      setImtiyozForm={setImtiyozForm}
      onSubmit={handleCreateImtiyoz}
      detailImtiyozlar={detailImtiyozlar}
      onDeactivate={handleDeactivateImtiyoz}
      monthKeyToDateInputValue={monthKeyToDateInputValue}
      dateInputValueToMonthKey={dateInputValueToMonthKey}
      formatMonthKey={(value) => formatMonthKey(value, locale)}
      imtiyozTypeLabel={(type) => imtiyozTypeLabel(type, t)}
      sumFormat={(value) => sumFormat(value, locale)}
    />
  );
}
