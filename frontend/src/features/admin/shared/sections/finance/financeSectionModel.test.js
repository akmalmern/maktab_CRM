import { describe, expect, it } from 'vitest';
import {
  buildFinanceCashflowPanel,
  buildFinanceSettingsValidation,
  buildFinanceStatusPanel,
} from './financeSectionModel';

const t = (value, vars) => {
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (acc, [key, replacement]) => acc.replace(`{{${key}}}`, String(replacement)),
    value,
  );
};

describe('financeSectionModel', () => {
  it('buildFinanceCashflowPanel maps summary cashflow to UI-friendly object', () => {
    const result = buildFinanceCashflowPanel({
      studentsSummary: {
        cashflow: {
          month: '2026-03',
          planAmount: 900000,
          collectedAmount: 850000,
          debtAmount: 300000,
          diffAmount: 50000,
          payrollPayoutAmount: 120000,
          payrollReversalAmount: 20000,
          payrollNetAmount: -100000,
          netAmount: 750000,
        },
      },
      locale: 'uz-UZ',
    });

    expect(result.planAmount).toBe(900000);
    expect(result.collectedAmount).toBe(850000);
    expect(result.debtAmount).toBe(300000);
    expect(result.netAmount).toBe(750000);
    expect(result.month).toContain('2026');
  });

  it('buildFinanceSettingsValidation validates billing draft and computes totals', () => {
    const result = buildFinanceSettingsValidation({
      settingsDraft: {
        oylikSumma: '320000',
        billingAcademicYear: '2025-2026',
        billingChargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
        izoh: 'update',
      },
      settings: {
        oylikSumma: 300000,
        yillikSumma: 3000000,
        tolovOylarSoni: 10,
        billingCalendar: {
          academicYear: '2025-2026',
          chargeableMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
        },
      },
      settingsMeta: {
        constraints: {
          minSumma: 50000,
          maxSumma: 50000000,
        },
      },
      t,
      locale: 'uz-UZ',
    });

    expect(result.valid).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.computed.oylik).toBe(320000);
    expect(result.computed.yillik).toBe(3200000);
    expect(result.computed.tolovOylarSoni).toBe(10);
  });

  it('buildFinanceStatusPanel returns scoped cards for summary widgets', () => {
    const result = buildFinanceStatusPanel({
      studentsSummary: {
        totalRows: 20,
        totalDebtors: 3,
        totalDebtAmount: 900000,
        thisMonthPaidAmount: 600000,
        thisMonthDebtAmount: 300000,
        cashflow: {
          payrollPayoutAmount: 120000,
          netAmount: 480000,
        },
        tarifOylikSumma: 300000,
        tarifYillikSumma: 3000000,
        tarifTolovOylarSoni: 10,
      },
      studentsState: {
        page: 1,
        pages: 2,
        limit: 20,
      },
      settings: {
        oylikSumma: 300000,
        yillikSumma: 3000000,
        tolovOylarSoni: 10,
      },
      t,
      locale: 'uz-UZ',
    });

    expect(result).toHaveLength(9);
    expect(result[0].value).toBe(20);
    expect(result[1].value).toBe(3);
    expect(String(result[2].value)).toContain('900');
  });
});
