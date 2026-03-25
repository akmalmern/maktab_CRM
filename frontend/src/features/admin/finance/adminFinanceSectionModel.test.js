import { describe, expect, it, vi } from 'vitest';
import { buildAdminFinanceSectionViewModel } from './adminFinanceSectionModel';

describe('buildAdminFinanceSectionViewModel', () => {
  it('maps page state into section view-model shape', () => {
    const pageState = {
      classrooms: [{ id: 'c-1' }],
      financeSettings: { oylikSumma: 300000 },
      financeSettingsMeta: { constraints: {} },
      financeStudentsState: {
        items: [{ id: 's-1' }],
        summary: { totalDebtAmount: 1200000 },
      },
      financeQuery: { status: 'ALL', page: 1 },
      exporting: '',
      financeActionLoading: false,
      handleFinanceQueryChange: vi.fn(),
      handleSaveFinanceSettings: vi.fn(),
      handleCreateFinancePayment: vi.fn(),
      handleCreateFinanceImtiyoz: vi.fn(),
      handleDeactivateFinanceImtiyoz: vi.fn(),
      handleRollbackFinanceTarif: vi.fn(),
      handleRevertFinancePayment: vi.fn(),
      handleExportFinanceDebtors: vi.fn(),
      handleOpenPayroll: vi.fn(),
    };

    const vm = buildAdminFinanceSectionViewModel(pageState);

    expect(vm.data.classrooms).toEqual([{ id: 'c-1' }]);
    expect(vm.data.settings.oylikSumma).toBe(300000);
    expect(vm.data.studentsSummary.totalDebtAmount).toBe(1200000);
    expect(vm.data.query.status).toBe('ALL');
    expect(vm.actionLoading).toBe(false);
    expect(vm.actions.onCreatePayment).toBe(pageState.handleCreateFinancePayment);
    expect(vm.actions.onExportDebtors).toBe(pageState.handleExportFinanceDebtors);
  });
});
