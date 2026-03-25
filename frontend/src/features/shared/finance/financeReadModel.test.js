import { describe, expect, it } from 'vitest';
import {
  buildManagerDebtorSummaryCards,
  normalizeAdminFinanceSettings,
  normalizeAdminFinanceStudentsState,
  normalizeManagerGlobalSummaryState,
  normalizeManagerStudentsState,
} from './financeReadModel';

const t = (value) => value;

describe('financeReadModel', () => {
  it('normalizes admin finance settings with safe defaults', () => {
    const result = normalizeAdminFinanceSettings({
      settings: {
        oylikSumma: 350000,
      },
      preview: {
        studentCount: 12,
      },
    });

    expect(result.settings.oylikSumma).toBe(350000);
    expect(result.settings.yillikSumma).toBe(0);
    expect(result.meta.preview.studentCount).toBe(12);
    expect(result.meta.constraints.minSumma).toBe(50000);
  });

  it('normalizes admin finance students state and preserves nested cashflow fallbacks', () => {
    const result = normalizeAdminFinanceStudentsState({
      data: {
        students: [{ id: 'student-1' }],
        total: 4,
        summary: {
          totalDebtAmount: 900000,
          cashflow: {
            collectedAmount: 700000,
          },
        },
      },
      loading: true,
      fallbackLimit: 50,
    });

    expect(result.loading).toBe(true);
    expect(result.limit).toBe(50);
    expect(result.summary.totalDebtAmount).toBe(900000);
    expect(result.summary.cashflow.collectedAmount).toBe(700000);
    expect(result.summary.cashflow.planAmount).toBe(0);
  });

  it('normalizes manager debtor responses into stable UI state', () => {
    const studentsState = normalizeManagerStudentsState({
      data: {
        students: [{ id: 'student-1' }],
        total: 3,
        pages: 2,
        summary: {
          totalDebtors: 3,
          totalDebtAmount: 600000,
        },
      },
    });
    const globalSummaryState = normalizeManagerGlobalSummaryState({
      data: {
        summary: {
          totalDebtors: 7,
          totalDebtAmount: 1500000,
        },
      },
    });

    expect(studentsState.items).toHaveLength(1);
    expect(studentsState.summary.totalDebtAmount).toBe(600000);
    expect(globalSummaryState.totalDebtors).toBe(7);
    expect(globalSummaryState.totalDebtAmount).toBe(1500000);
  });

  it('builds manager summary cards from normalized read-model state', () => {
    const cards = buildManagerDebtorSummaryCards({
      globalSummaryState: {
        loading: false,
        totalDebtors: 5,
        totalDebtAmount: 1200000,
      },
      selectedTotal: 2,
      selectedRecordsLabel: 'Tanlangan sinf yozuvlari',
      locale: 'uz-UZ',
      t,
      formatMoney: (value) => `${value} so'm`,
    });

    expect(cards).toEqual([
      { label: 'Jami qarzdorlar (umumiy)', value: 5 },
      { label: "Jami qarz summasi (umumiy)", value: "1200000 so'm" },
      { label: 'Tanlangan sinf yozuvlari', value: 2 },
    ]);
  });
});
