/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useAdminFinancePage from './useAdminFinancePage';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
  askConfirm: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  useGetClassroomsQuery: vi.fn(),
  useGetFinanceSettingsQuery: vi.fn(),
  useGetFinanceStudentsQuery: vi.fn(),
  useUpdateFinanceSettingsMutation: vi.fn(),
  useCreateFinancePaymentMutation: vi.fn(),
  useCreateFinanceImtiyozMutation: vi.fn(),
  useDeactivateFinanceImtiyozMutation: vi.fn(),
  useRollbackFinanceTarifMutation: vi.fn(),
  useRevertFinancePaymentMutation: vi.fn(),
  useExportFinanceDebtorsMutation: vi.fn(),
  saveDownloadedFile: vi.fn(),
  getErrorMessage: vi.fn(),
  createFinancePayment: vi.fn(),
  updateFinanceSettings: vi.fn(),
  createFinanceImtiyoz: vi.fn(),
  deactivateFinanceImtiyoz: vi.fn(),
  rollbackFinanceTarif: vi.fn(),
  revertFinancePayment: vi.fn(),
  exportFinanceDebtors: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value, vars) => {
      if (!vars) return value;
      return Object.entries(vars).reduce(
        (acc, [key, replacement]) => acc.replace(`{{${key}}}`, String(replacement)),
        value,
      );
    },
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('../../../hooks/useAsyncConfirm', () => ({
  default: () => ({
    askConfirm: mocks.askConfirm,
    confirmModalProps: {
      open: false,
      title: '',
      message: '',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    },
  }),
}));

vi.mock('../../../services/api/classroomsApi', () => ({
  useGetClassroomsQuery: mocks.useGetClassroomsQuery,
}));

vi.mock('../../../services/api/financeApi', () => ({
  useGetFinanceSettingsQuery: mocks.useGetFinanceSettingsQuery,
  useGetFinanceStudentsQuery: mocks.useGetFinanceStudentsQuery,
  useUpdateFinanceSettingsMutation: mocks.useUpdateFinanceSettingsMutation,
  useCreateFinancePaymentMutation: mocks.useCreateFinancePaymentMutation,
  useCreateFinanceImtiyozMutation: mocks.useCreateFinanceImtiyozMutation,
  useDeactivateFinanceImtiyozMutation: mocks.useDeactivateFinanceImtiyozMutation,
  useRollbackFinanceTarifMutation: mocks.useRollbackFinanceTarifMutation,
  useRevertFinancePaymentMutation: mocks.useRevertFinancePaymentMutation,
}));

vi.mock('../../../services/api/exportApi', () => ({
  useExportFinanceDebtorsMutation: mocks.useExportFinanceDebtorsMutation,
}));

vi.mock('../../../lib/downloadUtils', () => ({
  saveDownloadedFile: mocks.saveDownloadedFile,
}));

vi.mock('../../../lib/apiClient', () => ({
  getErrorMessage: mocks.getErrorMessage,
}));

describe('useAdminFinancePage', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams();
    mocks.setSearchParams.mockReset();
    mocks.setSearchParams.mockImplementation((nextSearchParams) => {
      mocks.searchParams = new URLSearchParams(nextSearchParams);
    });
    mocks.navigate.mockReset();
    mocks.askConfirm.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.saveDownloadedFile.mockReset();
    mocks.getErrorMessage.mockReset();

    mocks.createFinancePayment.mockReset();
    mocks.createFinancePayment.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.updateFinanceSettings.mockReset();
    mocks.updateFinanceSettings.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.createFinanceImtiyoz.mockReset();
    mocks.createFinanceImtiyoz.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.deactivateFinanceImtiyoz.mockReset();
    mocks.deactivateFinanceImtiyoz.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.rollbackFinanceTarif.mockReset();
    mocks.rollbackFinanceTarif.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.revertFinancePayment.mockReset();
    mocks.revertFinancePayment.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.exportFinanceDebtors.mockReset();
    mocks.exportFinanceDebtors.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });

    mocks.useGetClassroomsQuery.mockReturnValue({
      data: {
        classrooms: [{ id: 'class-1', name: '7-A', academicYear: '2025-2026' }],
      },
    });
    mocks.useGetFinanceSettingsQuery.mockReturnValue({
      data: {
        settings: {
          oylikSumma: 320000,
        },
        constraints: {
          minSumma: 50000,
          maxSumma: 50000000,
        },
      },
    });
    mocks.useGetFinanceStudentsQuery.mockReturnValue({
      data: {
        students: [{ id: 'student-1', fullName: 'Ali Karimov' }],
        page: 2,
        total: 1,
        pages: 1,
        summary: {
          totalDebtAmount: 900000,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    });

    mocks.useUpdateFinanceSettingsMutation.mockReturnValue([
      mocks.updateFinanceSettings,
      { isLoading: false },
    ]);
    mocks.useCreateFinancePaymentMutation.mockReturnValue([
      mocks.createFinancePayment,
      { isLoading: false },
    ]);
    mocks.useCreateFinanceImtiyozMutation.mockReturnValue([
      mocks.createFinanceImtiyoz,
      { isLoading: false },
    ]);
    mocks.useDeactivateFinanceImtiyozMutation.mockReturnValue([
      mocks.deactivateFinanceImtiyoz,
      { isLoading: false },
    ]);
    mocks.useRollbackFinanceTarifMutation.mockReturnValue([
      mocks.rollbackFinanceTarif,
      { isLoading: false },
    ]);
    mocks.useRevertFinancePaymentMutation.mockReturnValue([
      mocks.revertFinancePayment,
      { isLoading: false },
    ]);
    mocks.useExportFinanceDebtorsMutation.mockReturnValue([
      mocks.exportFinanceDebtors,
    ]);
  });

  it('maps mocked finance queries into normalized view-model state', () => {
    const { result } = renderHook(() => useAdminFinancePage());

    expect(result.current.classrooms).toEqual([
      { id: 'class-1', name: '7-A', academicYear: '2025-2026' },
    ]);
    expect(result.current.financeSettings.oylikSumma).toBe(320000);
    expect(result.current.financeStudentsState.items).toHaveLength(1);
    expect(result.current.financeStudentsState.page).toBe(2);
    expect(result.current.financeStudentsState.summary.totalDebtAmount).toBe(900000);
    expect(result.current.financeQuery.status).toBe('ALL');
  });

  it('updates query state and syncs URL search params', async () => {
    const { result, rerender } = renderHook(() => useAdminFinancePage());

    await act(async () => {
      result.current.handleFinanceQueryChange({
        search: 'Ali',
        status: 'QARZDOR',
        page: 3,
      });
    });

    expect(mocks.setSearchParams).toHaveBeenCalledTimes(1);
    const [params, options] = mocks.setSearchParams.mock.calls[0];
    expect(params.get('search')).toBe('Ali');
    expect(params.get('status')).toBe('QARZDOR');
    expect(params.get('page')).toBe('3');
    expect(options).toEqual({ replace: true });

    mocks.searchParams = params;
    rerender();
    await waitFor(() => {
      expect(result.current.financeQuery.search).toBe('Ali');
    });
    expect(result.current.financeQuery.status).toBe('QARZDOR');
    expect(result.current.financeQuery.page).toBe(3);
  });

  it('syncs finance query when URL search params change externally', async () => {
    const { result, rerender } = renderHook(() => useAdminFinancePage());

    mocks.searchParams = new URLSearchParams('status=QARZDOR&page=4&search=Karim');
    rerender();

    await waitFor(() => {
      expect(result.current.financeQuery.status).toBe('QARZDOR');
    });
    expect(result.current.financeQuery.page).toBe(4);
    expect(result.current.financeQuery.search).toBe('Karim');
  });

  it("returns true and sends idempotency key when creating payment succeeds", async () => {
    const { result } = renderHook(() => useAdminFinancePage());

    let success;
    await act(async () => {
      success = await result.current.handleCreateFinancePayment('student-1', {
        turi: 'OYLIK',
        startMonth: '2026-09',
      });
    });

    expect(success).toBe(true);
    expect(mocks.createFinancePayment).toHaveBeenCalledTimes(1);
    expect(mocks.createFinancePayment.mock.calls[0][0]).toMatchObject({
      studentId: 'student-1',
      payload: {
        turi: 'OYLIK',
        startMonth: '2026-09',
      },
    });
    expect(mocks.createFinancePayment.mock.calls[0][0].payload.idempotencyKey).toEqual(
      expect.any(String),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("To'lov saqlandi");
  });

  it('returns false and surfaces API message when creating payment fails', async () => {
    mocks.createFinancePayment.mockReturnValueOnce({
      unwrap: () => Promise.reject({ message: 'Server xatosi' }),
    });
    const { result } = renderHook(() => useAdminFinancePage());

    let success;
    await act(async () => {
      success = await result.current.handleCreateFinancePayment('student-1', {
        turi: 'OYLIK',
        startMonth: '2026-09',
      });
    });

    expect(success).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith('Server xatosi');
  });
});
