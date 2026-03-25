// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import usePayrollSectionController from './usePayrollSectionController';
import usePayrollEmployeeConfigActions from './usePayrollEmployeeConfigActions';
import usePayrollRatesActions from './usePayrollRatesActions';
import usePayrollRunActions from './usePayrollRunActions';

vi.mock('./usePayrollRatesActions');
vi.mock('./usePayrollRunActions');
vi.mock('./usePayrollEmployeeConfigActions');

function createArgs(overrides = {}) {
  const query = { refetch: vi.fn() };
  return {
    t: (value) => value,
    askConfirm: vi.fn(),
    periodMonth: '2026-03',
    setRunFilters: vi.fn(),
    setSelectedRunId: vi.fn(),
    payrollRunsQuery: query,
    payrollAutomationHealthQuery: { refetch: vi.fn() },
    payrollMonthlyReportQuery: { refetch: vi.fn() },
    payrollRunDetailQuery: { refetch: vi.fn() },
    activeRunId: 'run_1',
    selectedRun: { id: 'run_1' },
    lineOwnerFilter: {},
    lineFilters: { page: 3, type: '' },
    setLineFilters: vi.fn(),
    teacherRateForm: {},
    setTeacherRateForm: vi.fn(),
    subjectRateForm: {},
    setSubjectRateForm: vi.fn(),
    setRateCreateDrawer: vi.fn(),
    rateEditModal: {},
    setRateEditModal: vi.fn(),
    adjustmentForm: {},
    setAdjustmentForm: vi.fn(),
    setAdjustmentDrawerOpen: vi.fn(),
    payForm: {},
    payItemModal: {},
    setPayItemModal: vi.fn(),
    payItemForm: {},
    setPayItemForm: vi.fn(),
    employeeConfigModal: {},
    setEmployeeConfigModal: vi.fn(),
    reverseReason: '',
    setReverseReason: vi.fn(),
    automationForm: { mode: 'GENERATE_ONLY', force: false, paymentMethod: 'BANK' },
    ...overrides,
  };
}

beforeEach(() => {
  usePayrollRatesActions.mockReturnValue({
    ratesReloadKey: 'k',
    isRatesBusy: false,
    handleCreateTeacherRate: vi.fn(),
    handleDeleteTeacherRate: vi.fn(),
    handleCreateSubjectRate: vi.fn(),
    handleDeleteSubjectRate: vi.fn(),
    openRateCreateDrawer: vi.fn(),
    closeRateCreateDrawer: vi.fn(),
    openTeacherRateEditModal: vi.fn(),
    openSubjectRateEditModal: vi.fn(),
    closeRateEditModal: vi.fn(),
    handleSubmitRateEdit: vi.fn(),
  });
  usePayrollRunActions.mockReturnValue({
    isRunBusy: false,
    handleGenerateRun: vi.fn(),
    handleAddAdjustment: vi.fn(),
    handleApproveRun: vi.fn(),
    handlePayRun: vi.fn(),
    openPayItemModal: vi.fn(),
    closePayItemModal: vi.fn(),
    handlePayItem: vi.fn(),
    handleReverseRun: vi.fn(),
    handleExportRunExcel: vi.fn(),
    handleRunAutomation: vi.fn(),
  });
  usePayrollEmployeeConfigActions.mockReturnValue({
    isEmployeeConfigBusy: false,
    openEmployeeConfigModal: vi.fn(),
    closeEmployeeConfigModal: vi.fn(),
    handleSaveEmployeeConfig: vi.fn(),
  });
});

describe('usePayrollSectionController', () => {
  it('aggregates busy flag from child hooks', () => {
    usePayrollRunActions.mockReturnValueOnce({
      isRunBusy: true,
      handleGenerateRun: vi.fn(),
      handleAddAdjustment: vi.fn(),
      handleApproveRun: vi.fn(),
      handlePayRun: vi.fn(),
      openPayItemModal: vi.fn(),
      closePayItemModal: vi.fn(),
      handlePayItem: vi.fn(),
      handleReverseRun: vi.fn(),
      handleExportRunExcel: vi.fn(),
      handleRunAutomation: vi.fn(),
    });
    const { result } = renderHook(() => usePayrollSectionController(createArgs()));
    expect(result.current.busy).toBe(true);
    expect(result.current.ratesReloadKey).toBe('k');
  });

  it('refreshes all dashboard queries', () => {
    const args = createArgs();
    const { result } = renderHook(() => usePayrollSectionController(args));
    result.current.handleRefreshRunsDashboard();
    expect(args.payrollRunsQuery.refetch).toHaveBeenCalled();
    expect(args.payrollAutomationHealthQuery.refetch).toHaveBeenCalled();
    expect(args.payrollMonthlyReportQuery.refetch).toHaveBeenCalled();
    expect(args.payrollRunDetailQuery.refetch).toHaveBeenCalled();
  });

  it('selecting run resets line page', () => {
    const setSelectedRunId = vi.fn();
    const setLineFilters = vi.fn();
    const { result } = renderHook(() => usePayrollSectionController(createArgs({
      setSelectedRunId,
      setLineFilters,
    })));
    result.current.handleSelectRunId('run_2');
    expect(setSelectedRunId).toHaveBeenCalledWith('run_2');
    expect(setLineFilters).toHaveBeenCalled();
    const updater = setLineFilters.mock.calls[0][0];
    expect(updater({ page: 5, type: 'BONUS' })).toEqual({ page: 1, type: 'BONUS' });
  });
});
