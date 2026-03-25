import { useCallback } from 'react';
import usePayrollEmployeeConfigActions from './usePayrollEmployeeConfigActions';
import usePayrollRatesActions from './usePayrollRatesActions';
import usePayrollRunActions from './usePayrollRunActions';

export default function usePayrollSectionController({
  t,
  askConfirm,
  periodMonth,
  setRunFilters,
  setSelectedRunId,
  payrollRunsQuery,
  payrollAutomationHealthQuery,
  payrollMonthlyReportQuery,
  payrollRunDetailQuery,
  activeRunId,
  selectedRun,
  lineOwnerFilter,
  lineFilters,
  setLineFilters,
  teacherRateForm,
  setTeacherRateForm,
  subjectRateForm,
  setSubjectRateForm,
  setRateCreateDrawer,
  rateEditModal,
  setRateEditModal,
  adjustmentForm,
  setAdjustmentForm,
  setAdjustmentDrawerOpen,
  payForm,
  payItemModal,
  setPayItemModal,
  payItemForm,
  setPayItemForm,
  employeeConfigModal,
  setEmployeeConfigModal,
  reverseReason,
  setReverseReason,
  automationForm,
}) {
  const ratesActions = usePayrollRatesActions({
    t,
    askConfirm,
    teacherRateForm,
    setTeacherRateForm,
    subjectRateForm,
    setSubjectRateForm,
    setRateCreateDrawer,
    rateEditModal,
    setRateEditModal,
  });

  const employeeConfigActions = usePayrollEmployeeConfigActions({
    t,
    employeeConfigModal,
    setEmployeeConfigModal,
  });

  const runActions = usePayrollRunActions({
    t,
    askConfirm,
    periodMonth,
    setRunFilters,
    setSelectedRunId,
    payrollRunsQuery,
    payrollAutomationHealthQuery,
    payrollMonthlyReportQuery,
    activeRunId,
    selectedRun,
    lineOwnerFilter,
    lineFilters,
    adjustmentForm,
    setAdjustmentForm,
    setAdjustmentDrawerOpen,
    payForm,
    payItemModal,
    setPayItemModal,
    payItemForm,
    setPayItemForm,
    reverseReason,
    setReverseReason,
    automationForm,
  });

  const busy =
    ratesActions.isRatesBusy ||
    employeeConfigActions.isEmployeeConfigBusy ||
    runActions.isRunBusy;

  const handleRefreshRunsDashboard = useCallback(() => {
    payrollRunsQuery.refetch();
    payrollAutomationHealthQuery.refetch();
    payrollMonthlyReportQuery.refetch();
    if (activeRunId) {
      payrollRunDetailQuery.refetch();
    }
  }, [
    activeRunId,
    payrollAutomationHealthQuery,
    payrollMonthlyReportQuery,
    payrollRunDetailQuery,
    payrollRunsQuery,
  ]);

  const handleSelectRunId = useCallback((nextRunId) => {
    setSelectedRunId(nextRunId);
    setLineFilters((prev) => ({ ...prev, page: 1 }));
  }, [setLineFilters, setSelectedRunId]);

  return {
    busy,
    ratesReloadKey: ratesActions.ratesReloadKey,
    handleGenerateRun: runActions.handleGenerateRun,
    handleCreateTeacherRate: ratesActions.handleCreateTeacherRate,
    handleDeleteTeacherRate: ratesActions.handleDeleteTeacherRate,
    handleCreateSubjectRate: ratesActions.handleCreateSubjectRate,
    handleDeleteSubjectRate: ratesActions.handleDeleteSubjectRate,
    openRateCreateDrawer: ratesActions.openRateCreateDrawer,
    closeRateCreateDrawer: ratesActions.closeRateCreateDrawer,
    openTeacherRateEditModal: ratesActions.openTeacherRateEditModal,
    openSubjectRateEditModal: ratesActions.openSubjectRateEditModal,
    closeRateEditModal: ratesActions.closeRateEditModal,
    handleSubmitRateEdit: ratesActions.handleSubmitRateEdit,
    handleAddAdjustment: runActions.handleAddAdjustment,
    handleApproveRun: runActions.handleApproveRun,
    handlePayRun: runActions.handlePayRun,
    openPayItemModal: runActions.openPayItemModal,
    closePayItemModal: runActions.closePayItemModal,
    handlePayItem: runActions.handlePayItem,
    openEmployeeConfigModal: employeeConfigActions.openEmployeeConfigModal,
    closeEmployeeConfigModal: employeeConfigActions.closeEmployeeConfigModal,
    handleSaveEmployeeConfig: employeeConfigActions.handleSaveEmployeeConfig,
    handleReverseRun: runActions.handleReverseRun,
    handleExportRunExcel: runActions.handleExportRunExcel,
    handleRunAutomation: runActions.handleRunAutomation,
    handleRefreshRunsDashboard,
    handleSelectRunId,
  };
}
