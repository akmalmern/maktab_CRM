import { describe, expect, it } from 'vitest';
import {
  buildFinanceCashflowCards,
  buildFinanceCashflowDiffView,
} from './financeCashflowViewModel';

describe('financeCashflowViewModel', () => {
  const t = (value) => value;
  const sumFormat = (value) => String(value);

  it('buildFinanceCashflowCards primary va secondary kartalarni yig`adi', () => {
    const result = buildFinanceCashflowCards({
      cashflowPanel: {
        planAmount: 900000,
        collectedAmount: 850000,
        debtAmount: 300000,
        payrollPayoutAmount: 120000,
        payrollReversalAmount: 20000,
        netAmount: 730000,
      },
      locale: 'uz-UZ',
      sumFormat,
      t,
    });

    expect(result.primaryCards).toHaveLength(3);
    expect(result.secondaryCards).toHaveLength(3);
    expect(result.primaryCards[0].value).toBe("900000 so'm");
    expect(result.secondaryCards[2].tone).toBe('success');
  });

  it('buildFinanceCashflowDiffView diff matni va rangini qaytaradi', () => {
    expect(
      buildFinanceCashflowDiffView({
        diffAmount: 50000,
        locale: 'uz-UZ',
        sumFormat,
        t,
      }),
    ).toEqual({
      className: 'text-rose-700',
      value: "50000 so'm kam tushgan",
    });

    expect(
      buildFinanceCashflowDiffView({
        diffAmount: -10000,
        locale: 'uz-UZ',
        sumFormat,
        t,
      }),
    ).toEqual({
      className: 'text-emerald-700',
      value: "10000 so'm ko'p tushgan",
    });
  });
});
