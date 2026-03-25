import FinanceSettingsPanelView from './FinanceSettingsPanel';
import {
  BILLING_MONTH_OPTIONS,
  isValidAcademicYearLabel,
  monthNameByNumber,
  normalizeBillingMonths,
  SCHOOL_MONTH_ORDER,
  sumFormat,
} from './financeSectionModel';
import { FieldLabel, MiniStatCard } from './financeUiShared';

export default function FinanceSettingsWorkspace({
  t,
  locale,
  settings,
  settingsMeta,
  settingsDraft,
  setSettingsDraft,
  settingsValidation,
  actionLoading,
  handleSaveSettings,
  handleResetDraft,
  handleDefaultDraft,
  toggleBillingMonth,
  billingAcademicYearOptions,
}) {
  return (
    <FinanceSettingsPanelView
      t={t}
      settings={settings}
      settingsMeta={settingsMeta}
      settingsDraft={settingsDraft}
      setSettingsDraft={setSettingsDraft}
      settingsValidation={settingsValidation}
      actionLoading={actionLoading}
      handleSaveSettings={handleSaveSettings}
      handleResetDraft={handleResetDraft}
      handleDefaultDraft={handleDefaultDraft}
      toggleBillingMonth={toggleBillingMonth}
      billingAcademicYearOptions={billingAcademicYearOptions}
      locale={locale}
      sumFormat={sumFormat}
      normalizeBillingMonths={normalizeBillingMonths}
      isValidAcademicYearLabel={isValidAcademicYearLabel}
      monthNameByNumber={monthNameByNumber}
      SCHOOL_MONTH_ORDER={SCHOOL_MONTH_ORDER}
      BILLING_MONTH_OPTIONS={BILLING_MONTH_OPTIONS}
      FieldLabel={FieldLabel}
      MiniStatCard={MiniStatCard}
    />
  );
}
