import { describe, expect, it } from 'vitest';
import {
  buildManagerImtiyozMutationPayload,
  buildManagerPaymentModalState,
  buildManagerPaymentMutationPayload,
  buildManagerPaymentPreviewPayload,
  firstManagerDebtMonth,
} from './managerPaymentPayloads';

describe('managerPaymentPayloads', () => {
  it('buildManagerPaymentPreviewPayload yillik to`lovni 12 oyga normallashtiradi', () => {
    expect(
      buildManagerPaymentPreviewPayload({
        turi: 'YILLIK',
        startMonth: '2026-09',
        oylarSoni: 2,
        summa: '',
        izoh: 'test',
      }),
    ).toEqual({
      turi: 'YILLIK',
      startMonth: '2026-09',
      oylarSoni: 12,
      izoh: 'test',
    });
  });

  it('buildManagerPaymentMutationPayload idempotencyKey ni qo`shadi', () => {
    expect(
      buildManagerPaymentMutationPayload(
        {
          turi: 'OYLIK',
          startMonth: '2026-03',
          oylarSoni: 2,
          summa: '150000',
          izoh: '',
        },
        'request-key',
      ),
    ).toEqual({
      turi: 'OYLIK',
      startMonth: '2026-03',
      oylarSoni: 2,
      summa: 150000,
      idempotencyKey: 'request-key',
    });
  });

  it('buildManagerImtiyozMutationPayload keraksiz qiymatni TOLIQ_OZOD uchun tashlaydi', () => {
    expect(
      buildManagerImtiyozMutationPayload({
        turi: 'TOLIQ_OZOD',
        boshlanishOy: '2026-03',
        oylarSoni: 3,
        qiymat: '50000',
        sabab: 'grant',
        izoh: 'note',
      }),
    ).toEqual({
      turi: 'TOLIQ_OZOD',
      boshlanishOy: '2026-03',
      oylarSoni: 3,
      sabab: 'grant',
      izoh: 'note',
    });
  });

  it('buildManagerPaymentModalState birinchi qarz oydan formalarni tayyorlaydi', () => {
    const result = buildManagerPaymentModalState({
      qarzOylar: ['2026-02', '2026-03'],
    });

    expect(result.startMonth).toBe('2026-02');
    expect(result.paymentForm.startMonth).toBe('2026-02');
    expect(result.imtiyozForm.boshlanishOy).toBe('2026-02');
  });

  it('firstManagerDebtMonth qarz oy bo`lmasa joriy oyni qaytaradi', () => {
    expect(firstManagerDebtMonth({ qarzOylar: ['2026-01'] })).toBe('2026-01');
    expect(firstManagerDebtMonth(null)).toMatch(/^\d{4}-\d{2}$/);
  });
});
