/* @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FinancePaymentModal from './FinancePaymentModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value) => value,
    i18n: { language: 'uz' },
  }),
}));

function createBaseProps(overrides = {}) {
  return {
    t: (value) => value,
    modalOpen: true,
    setModalOpen: vi.fn(),
    selectedStudentId: 'student-1',
    detailState: {
      loading: false,
      error: null,
      transactions: [],
    },
    detailStudent: {
      fullName: 'Ali Karimov',
      qarzOylarSoni: 2,
      qarzOylar: ['2026-01', '2026-02'],
      qarzOylarFormatted: ['2026-01', '2026-02'],
    },
    detailImtiyozlar: [],
    paymentModalTab: 'payment',
    setPaymentModalTab: vi.fn(),
    actionLoading: false,
    onRollbackTarif: vi.fn(),
    settingsMeta: {
      tarifHistory: [],
    },
    onRevertPayment: vi.fn(),
    paymentForm: { turi: 'OYLIK', startMonth: '2026-01', oylarSoni: 1, summa: '', izoh: '' },
    setPaymentForm: vi.fn(),
    handleCreatePayment: vi.fn(),
    isSelectedDetailReady: true,
    paymentPreview: { valid: true, previewMonthsCount: 1 },
    serverPreviewLoading: false,
    serverPreviewError: '',
    imtiyozForm: { turi: 'FOIZ', boshlanishOy: '2026-01', oylarSoni: 1, qiymat: '10', sabab: 'Test', izoh: '' },
    setImtiyozForm: vi.fn(),
    handleCreateImtiyoz: vi.fn(),
    handleDeactivateImtiyoz: vi.fn(),
    MonthChips: ({ months = [] }) => <div data-testid="month-chips">{months.join(',')}</div>,
    formatMonthKey: (value) => value,
    sumFormat: (value) => String(value),
    locale: 'uz-UZ',
    ...overrides,
  };
}

describe('FinancePaymentModal', () => {
  it('shows empty state when no student is selected', () => {
    render(
      <FinancePaymentModal
        {...createBaseProps({
          selectedStudentId: null,
        })}
      />,
    );

    expect(screen.getByText('Student tanlanmagan')).toBeInTheDocument();
    expect(screen.queryByText("To'lov turi")).not.toBeInTheDocument();
  });

  it('renders payment tab content and switches to imtiyoz tab', () => {
    const setPaymentModalTab = vi.fn();
    render(
      <FinancePaymentModal
        {...createBaseProps({
          setPaymentModalTab,
        })}
      />,
    );

    expect(screen.getByText("To'lov turi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Imtiyoz' }));
    expect(setPaymentModalTab).toHaveBeenCalledWith('imtiyoz');
  });

  it('shows tariff rollback controls in history tab and disables active tariff rollback', () => {
    render(
      <FinancePaymentModal
        {...createBaseProps({
          paymentModalTab: 'history',
          settingsMeta: {
            tarifHistory: [
              {
                id: 'tarif-active',
                holat: 'AKTIV',
                oylikSumma: 300000,
                yillikSumma: 3000000,
                boshlanishSana: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'tarif-old',
                holat: 'ARXIV',
                oylikSumma: 250000,
                yillikSumma: 2500000,
                boshlanishSana: '2025-01-01T00:00:00.000Z',
              },
            ],
          },
        })}
      />,
    );

    expect(screen.getByText('Tarif versiyalari')).toBeInTheDocument();
    const rollbackButtons = screen.getAllByRole('button', { name: 'Orqaga qaytarish' });
    expect(rollbackButtons).toHaveLength(2);
    expect(rollbackButtons[0]).toBeDisabled();
    expect(rollbackButtons[1]).not.toBeDisabled();
  });
});
