import { describe, expect, it } from 'vitest';
import {
  buildManagerPaymentPreview,
  buildMonthRange,
  dateInputValueToMonthKey,
  mergeManagerServerPaymentPreview,
  managerSelectedClassRecordsLabel,
  monthKeyToDateInputValue,
} from './managerDebtorsModel';

describe('managerDebtorsModel', () => {
  it('builds month ranges across year boundaries', () => {
    expect(buildMonthRange('2026-11', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('round-trips month keys through date input values', () => {
    expect(dateInputValueToMonthKey(monthKeyToDateInputValue('2026-03'))).toBe('2026-03');
  });

  it('calculates preview totals from debt months', () => {
    const preview = buildManagerPaymentPreview(
      {
        qarzOylarDetal: [
          { key: '2026-01', oySumma: 150000 },
          { key: '2026-02', oySumma: 200000 },
        ],
      },
      {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 2,
        summa: '',
      },
    );

    expect(preview).toMatchObject({
      expectedSumma: 350000,
      finalSumma: 350000,
      valid: true,
      previewMonthsCount: 2,
    });
  });

  it('merges server preview into manager preview contract', () => {
    const localPreview = buildManagerPaymentPreview(
      {
        qarzOylarDetal: [
          { key: '2026-01', oySumma: 150000 },
          { key: '2026-02', oySumma: 200000 },
        ],
      },
      {
        turi: 'OYLIK',
        startMonth: '2026-01',
        oylarSoni: 2,
        summa: '',
      },
    );

    const merged = mergeManagerServerPaymentPreview(localPreview, {
      canSubmit: true,
      qismanTolov: true,
      previewMonthsCount: 1,
      expectedSumma: 350000,
      finalSumma: 150000,
      appliedMonths: ['2026-01'],
      alreadyPaidMonthsFormatted: ['February 2026'],
      allocations: [{ key: '2026-01', qoldiq: 150000 }],
    });

    expect(merged.debtClosingMonths).toEqual(['2026-01']);
    expect(merged.selectedDebtAmounts).toEqual([{ key: '2026-01', amount: 150000 }]);
    expect(merged.alreadyPaidMonthsFormatted).toEqual(['February 2026']);
    expect(merged.valid).toBe(true);
  });

  it('returns a clean Russian label without mojibake', () => {
    expect(managerSelectedClassRecordsLabel('ru')).toBe('Записи выбранного класса');
  });
});
