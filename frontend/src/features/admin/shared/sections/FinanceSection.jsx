import { useTranslation } from 'react-i18next';
import FinanceAdvancesWorkspace from './finance/FinanceAdvancesWorkspace';
import FinanceDialogsWorkspace from './finance/FinanceDialogsWorkspace';
import FinancePaymentsWorkspace from './finance/FinancePaymentsWorkspace';
import FinanceSectionHeader from './finance/FinanceSectionHeader';
import FinanceSettingsWorkspace from './finance/FinanceSettingsWorkspace';
import { resolveLocale } from './finance/financeSectionModel';
import useFinanceSectionController from './finance/useFinanceSectionController';

export default function FinanceSection({
  viewModel,
}) {
  const {
    data: {
      classrooms,
      settings,
      settingsMeta,
      studentsState,
      studentsSummary,
      query,
      exporting,
    },
    actions: {
      onChangeQuery,
      onSaveSettings,
      onCreatePayment,
      onCreateImtiyoz,
      onDeactivateImtiyoz,
      onRollbackTarif,
      onRevertPayment,
      onExportDebtors,
      onOpenPayroll,
    },
    actionLoading,
  } = viewModel;
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const {
    activeTab,
    setActiveTab,
    modalOpen,
    setModalOpen,
    paymentModalTab,
    setPaymentModalTab,
    selectedStudentId,
    settingsDraft,
    setSettingsDraft,
    paymentForm,
    setPaymentForm,
    imtiyozForm,
    setImtiyozForm,
    students,
    detailState,
    detailStudent,
    detailImtiyozlar,
    isSelectedDetailReady,
    settingsValidation,
    statusPanel,
    billingAcademicYearOptions,
    cashflowPanel,
    paymentPreview,
    serverPreviewState,
    openPaymentModal,
    handleSaveSettings,
    handleResetDraft,
    handleDefaultDraft,
    toggleBillingMonth,
    handleCreatePayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
  } = useFinanceSectionController({
    classrooms,
    settings,
    settingsMeta,
    studentsState,
    studentsSummary,
    onSaveSettings,
    onCreatePayment,
    onCreateImtiyoz,
    onDeactivateImtiyoz,
    t,
    locale,
  });

  return (
    <div className="space-y-4">
      <FinanceSectionHeader t={t} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'settings' && (
        <FinanceSettingsWorkspace
          t={t}
          locale={locale}
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
        />
      )}

      {activeTab === 'payments' && (
        <FinancePaymentsWorkspace
          t={t}
          locale={locale}
          query={query}
          onChangeQuery={onChangeQuery}
          classrooms={classrooms}
          studentsState={studentsState}
          students={students}
          statusPanel={statusPanel}
          cashflowPanel={cashflowPanel}
          exporting={exporting}
          onExportDebtors={onExportDebtors}
          onOpenPayroll={onOpenPayroll}
          openPaymentModal={openPaymentModal}
        />
      )}

      {activeTab === 'advances' && <FinanceAdvancesWorkspace />}

      <FinanceDialogsWorkspace
        t={t}
        locale={locale}
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
        serverPreviewState={serverPreviewState}
        imtiyozForm={imtiyozForm}
        setImtiyozForm={setImtiyozForm}
        handleCreateImtiyoz={handleCreateImtiyoz}
        handleDeactivateImtiyoz={handleDeactivateImtiyoz}
      />
    </div>
  );
}
