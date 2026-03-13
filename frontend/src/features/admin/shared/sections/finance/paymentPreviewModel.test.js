import { describe, expect, it } from 'vitest';
import {
  buildFinancePaymentPreview,
  buildFinancePreviewFromLocalAndServer,
  mergeServerPaymentPreview,
} from './paymentPreviewModel';

const detailStudent = {
  qarzOylar: ['2026-01', '2026-02'],
  qarzOylarSoni: 2,
  jamiQarzSumma: 600000,
  qarzOylarDetal: [
    { key: '2026-01', oySumma: 300000 },
    { key: '2026-02', oySumma: 300000 },
  ],
};

describe('paymentPreviewModel', () => {
  it("builds monthly preview with full debt closing", () => {
    const preview = buildFinancePaymentPreview({
      detailStudent,
      paymentForm: {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 2,
        summa: '',
      },
      oylikTarif: 300000,
    });

    expect(preview.previewMonthsCount).toBe(2);
    expect(preview.debtClosingMonths).toEqual(['2026-01', '2026-02']);
    expect(preview.prepaymentMonths).toEqual([]);
    expect(preview.expectedSumma).toBe(600000);
    expect(preview.valid).toBe(true);
    expect(preview.isPartialPayment).toBe(false);
  });

  it("adds prepayment months when selected range includes debt-free months", () => {
    const preview = buildFinancePaymentPreview({
      detailStudent,
      paymentForm: {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 3,
        summa: '',
      },
      oylikTarif: 300000,
    });

    expect(preview.debtExpectedSumma).toBe(600000);
    expect(preview.prepaymentExpectedSumma).toBe(300000);
    expect(preview.expectedSumma).toBe(900000);
    expect(preview.prepaymentMonths).toEqual(['2026-03']);
    expect(preview.valid).toBe(true);
  });

  it("requires explicit summa for IXTIYORIY payment type", () => {
    const preview = buildFinancePaymentPreview({
      detailStudent,
      paymentForm: {
        turi: 'IXTIYORIY',
        startMonth: '2026-01',
        oylarSoni: 1,
        summa: '',
      },
      oylikTarif: 300000,
    });

    expect(preview.requireManualSumma).toBe(true);
    expect(preview.missingManualSumma).toBe(true);
    expect(preview.valid).toBe(false);
  });

  it("marks preview invalid when entered summa exceeds expected amount", () => {
    const preview = buildFinancePaymentPreview({
      detailStudent,
      paymentForm: {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 1,
        summa: 500000,
      },
      oylikTarif: 300000,
    });

    expect(preview.expectedSumma).toBe(300000);
    expect(preview.exceedsExpectedSumma).toBe(true);
    expect(preview.valid).toBe(false);
  });

  it('merges server preview and blocks submit when already-paid months exist', () => {
    const localPreview = buildFinancePaymentPreview({
      detailStudent,
      paymentForm: {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 2,
        summa: 300000,
      },
      oylikTarif: 300000,
    });
    const merged = mergeServerPaymentPreview(localPreview, {
      canSubmit: true,
      qismanTolov: true,
      previewMonthsCount: 2,
      expectedSumma: 600000,
      finalSumma: 300000,
      appliedMonths: ['2026-01'],
      alreadyPaidMonths: ['2026-02'],
      allocations: [{ key: '2026-01', qoldiq: 300000 }],
    });

    expect(merged.debtClosingMonths).toEqual(['2026-01']);
    expect(merged.selectedDebtAmounts).toEqual([{ key: '2026-01', amount: 300000 }]);
    expect(merged.valid).toBe(false);
    expect(merged.serverPreview.alreadyPaidMonths).toEqual(['2026-02']);
  });

  it('builds merged preview from local+server in one helper', () => {
    const merged = buildFinancePreviewFromLocalAndServer({
      detailStudent,
      paymentForm: {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 1,
        summa: '',
      },
      oylikTarif: 300000,
      serverPreview: {
        canSubmit: true,
        qismanTolov: false,
        previewMonthsCount: 1,
        expectedSumma: 300000,
        finalSumma: 300000,
        appliedMonths: ['2026-01'],
        alreadyPaidMonths: [],
        allocations: [{ key: '2026-01', qoldiq: 300000 }],
      },
    });

    expect(merged.valid).toBe(true);
    expect(merged.expectedSumma).toBe(300000);
    expect(merged.debtClosingMonths).toEqual(['2026-01']);
  });
});
