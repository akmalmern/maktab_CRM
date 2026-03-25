import { describe, expect, it } from 'vitest';
import { buildFinanceLedgerItems } from './financeLedgerModel';

const t = (value) => value;

describe('financeLedgerModel', () => {
  it('payment va imtiyoz tarixini yagona timeline formatiga keltiradi', () => {
    const result = buildFinanceLedgerItems({
      transactions: [
        {
          id: 'txn-1',
          turi: 'OYLIK',
          summa: 300000,
          holat: 'BEKOR_QILINGAN',
          tolovSana: '2026-03-10T00:00:00.000Z',
          bekorSana: '2026-03-11T00:00:00.000Z',
          qoplanganOylarFormatted: ['Mart 2026'],
          qoplamalar: [],
        },
      ],
      imtiyozlar: [
        {
          id: 'im-1',
          turi: 'FOIZ',
          qiymat: 20,
          isActive: true,
          createdAt: '2026-03-09T00:00:00.000Z',
          oylarFormatted: ['Mart 2026'],
        },
      ],
      t,
      locale: 'uz-UZ',
    });

    expect(result).toHaveLength(3);
    expect(result[0].kind).toBe('PAYMENT_REVERT');
    expect(result[1].kind).toBe('PAYMENT');
    expect(result[2].kind).toBe('IMTIYOZ');
  });

  it('manager-style oylarSnapshot qiymatini oy labelga aylantiradi', () => {
    const result = buildFinanceLedgerItems({
      transactions: [],
      imtiyozlar: [
        {
          id: 'im-2',
          turi: 'SUMMA',
          qiymat: 50000,
          isActive: false,
          createdAt: '2026-03-09T00:00:00.000Z',
          bekorQilinganAt: '2026-03-12T00:00:00.000Z',
          oylarSnapshot: [{ yil: 2026, oy: 3 }],
        },
      ],
      t,
      locale: 'uz-UZ',
    });

    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe('IMTIYOZ_REVERT');
    expect(result[1].months[0]).toContain('2026');
  });
});
