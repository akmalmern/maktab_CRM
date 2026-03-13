/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PayrollRunsPanel } from './RunsPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value) => value,
    i18n: { language: 'uz' },
  }),
}));

function createBaseProps(overrides = {}) {
  return {
    tab: 'runs',
    periodMonth: '2026-03',
    setPeriodMonth: vi.fn(),
    setRunFilters: vi.fn(),
    runs: [],
    activeRunId: '',
    setSelectedRunId: vi.fn(),
    selectedRun: null,
    runsState: { loading: false, error: null },
    runDetailLoading: false,
    runDetailError: null,
    isAdminView: true,
    isManagerView: false,
    busy: false,
    handleRefreshRunsDashboard: vi.fn(),
    handleGenerateRun: vi.fn(),
    formatMoney: (value) => String(value),
    selectedRunPayableAmount: 0,
    selectedRunPaidAmount: 0,
    selectedRunRemainingAmount: 0,
    runItemsColumns: [{ key: 'name', header: 'Nomi' }],
    runItemsRows: [],
    selectedRunTeacherCount: 0,
    payForm: { paymentMethod: 'BANK' },
    setPayForm: vi.fn(),
    canPaySelectedRun: false,
    runPrimaryAction: null,
    canReverseSelectedRun: false,
    reverseReason: '',
    setReverseReason: vi.fn(),
    handleReverseRun: vi.fn(),
    ...overrides,
  };
}

describe('PayrollRunsPanel', () => {
  it('does not render content when current tab is not runs', () => {
    const { container } = render(
      <PayrollRunsPanel
        {...createBaseProps({
          tab: 'settings',
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders empty state when selected run is missing', () => {
    render(<PayrollRunsPanel {...createBaseProps()} />);
    expect(
      screen.getByText("Tanlangan oy uchun hisob-kitob topilmadi. Avval Yaratish tugmasini bosing."),
    ).toBeInTheDocument();
  });

  it('renders approved run controls and triggers primary action', () => {
    const onPrimary = vi.fn();
    render(
      <PayrollRunsPanel
        {...createBaseProps({
          runs: [{ id: 'run-1', periodMonth: '2026-03', status: 'APPROVED' }],
          activeRunId: 'run-1',
          selectedRun: { id: 'run-1', periodMonth: '2026-03', status: 'APPROVED' },
          selectedRunPayableAmount: 1000000,
          selectedRunPaidAmount: 0,
          selectedRunRemainingAmount: 1000000,
          selectedRunTeacherCount: 12,
          canPaySelectedRun: true,
          canReverseSelectedRun: true,
          runPrimaryAction: {
            label: "Barchasini to'lash",
            onClick: onPrimary,
            disabled: false,
            variant: 'success',
          },
        })}
      />,
    );

    expect(screen.getByText("To'lov usuli")).toBeInTheDocument();
    const primaryButton = screen.getByRole('button', { name: "Barchasini to'lash" });
    expect(primaryButton).toBeEnabled();
    fireEvent.click(primaryButton);
    expect(onPrimary).toHaveBeenCalledTimes(1);

    const reverseButton = screen.getByRole('button', { name: 'Bekor qilish' });
    expect(reverseButton).toBeDisabled();
  });
});
