import { describe, expect, it } from 'vitest';
import {
  buildFinanceDebtorsExportParams,
  buildFinancePaymentPayload,
  resolveFinanceExportFormat,
} from './financeActionUtils';

describe('financeActionUtils', () => {
  it('buildFinancePaymentPayload mavjud idempotency key ni saqlaydi', () => {
    expect(
      buildFinancePaymentPayload({
        turi: 'OYLIK',
        idempotencyKey: 'fixed-key',
      }),
    ).toEqual({
      turi: 'OYLIK',
      idempotencyKey: 'fixed-key',
    });
  });

  it("buildFinanceDebtorsExportParams 'all' classroom ni query'dan chiqaradi", () => {
    expect(
      buildFinanceDebtorsExportParams({
        search: 'Ali',
        classroomId: 'all',
      }),
    ).toEqual({
      search: 'Ali',
      classroomId: undefined,
    });
  });

  it('resolveFinanceExportFormat faqat xlsx ni saqlaydi, qolganini pdf qiladi', () => {
    expect(resolveFinanceExportFormat('xlsx')).toBe('xlsx');
    expect(resolveFinanceExportFormat('csv')).toBe('pdf');
  });
});
