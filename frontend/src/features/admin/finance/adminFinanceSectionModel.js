export function buildAdminFinanceSectionViewModel(pageState) {
  return {
    data: {
      classrooms: pageState.classrooms,
      settings: pageState.financeSettings,
      settingsMeta: pageState.financeSettingsMeta,
      studentsState: pageState.financeStudentsState,
      studentsSummary: pageState.financeStudentsState.summary,
      query: pageState.financeQuery,
      exporting: pageState.exporting,
    },
    actions: {
      onChangeQuery: pageState.handleFinanceQueryChange,
      onSaveSettings: pageState.handleSaveFinanceSettings,
      onCreatePayment: pageState.handleCreateFinancePayment,
      onCreateImtiyoz: pageState.handleCreateFinanceImtiyoz,
      onDeactivateImtiyoz: pageState.handleDeactivateFinanceImtiyoz,
      onRollbackTarif: pageState.handleRollbackFinanceTarif,
      onRevertPayment: pageState.handleRevertFinancePayment,
      onExportDebtors: pageState.handleExportFinanceDebtors,
      onOpenPayroll: pageState.handleOpenPayroll,
    },
    actionLoading: pageState.financeActionLoading,
  };
}
