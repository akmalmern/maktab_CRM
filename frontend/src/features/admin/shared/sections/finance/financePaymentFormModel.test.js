import { describe, expect, it } from 'vitest';
import {
  buildFinanceFillAllDebtsPatch,
  buildFinancePaymentQuickActionState,
  deriveFinancePaymentDebtMonths,
  isFinancePaymentSubmitDisabled,
} from './financePaymentFormModel';

describe('financePaymentFormModel', () => {
  const t = (value, vars) => {
    if (!vars) return value;
    return Object.entries(vars).reduce(
      (acc, [key, replacement]) => acc.replace(`{{${key}}}`, String(replacement)),
      value,
    );
  };

  it('deriveFinancePaymentDebtMonths qarz oylarni sort qiladi', () => {
    expect(
      deriveFinancePaymentDebtMonths({
        qarzOylar: ['2026-03', null, '2026-01'],
      }),
    ).toEqual(['2026-01', '2026-03']);
  });

  it('buildFinancePaymentQuickActionState tez amal matnini qaytaradi', () => {
    const result = buildFinancePaymentQuickActionState({
      detailStudent: { qarzOylar: ['2026-02', '2026-01'] },
      formatMonthKey: (value) => value,
      t,
    });

    expect(result.canFillAllDebts).toBe(true);
    expect(result.allDebtStartMonth).toBe('2026-01');
    expect(result.quickActionDescription).toBe('Qarzdor oylar: 2 ta (2026-01dan boshlab)');
  });

  it('buildFinanceFillAllDebtsPatch barcha qarzni yopish patchini qaytaradi', () => {
    expect(
      buildFinanceFillAllDebtsPatch({
        allDebtStartMonth: '2026-01',
        allDebtMonthsCount: 3,
      }),
    ).toEqual({
      turi: 'OYLIK',
      startMonth: '2026-01',
      oylarSoni: 3,
      summa: '',
    });
  });

  it('isFinancePaymentSubmitDisabled preview invalid bo`lsa true qaytaradi', () => {
    expect(
      isFinancePaymentSubmitDisabled({
        actionLoading: false,
        detailStateLoading: false,
        selectedStudentId: 'student-1',
        isSelectedDetailReady: true,
        paymentPreview: { valid: false, previewMonthsCount: 1 },
      }),
    ).toBe(true);
  });
});
