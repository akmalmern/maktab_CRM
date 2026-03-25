/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePayrollRatesDatasets } from './usePayrollRatesDatasets';

describe('usePayrollRatesDatasets', () => {
  it('loads first page for both teacher and subject rates when enabled', async () => {
    const loadPayrollTeacherRates = vi.fn((params) => ({
      unwrap: () => Promise.resolve({
        rates: params.page === 1 ? [{ id: 't-1' }] : [{ id: 't-2' }],
        total: 2,
        pages: 2,
      }),
    }));
    const loadPayrollSubjectRates = vi.fn(() => ({
      unwrap: () => Promise.resolve({
        rates: [{ id: 's-1' }],
        total: 1,
        pages: 1,
      }),
    }));

    const { result } = renderHook(() =>
      usePayrollRatesDatasets({
        shouldLoad: true,
        reloadKey: 'v1',
        loadPayrollTeacherRates,
        loadPayrollSubjectRates,
      }),
    );

    await waitFor(() => {
      expect(result.current.payrollTeacherRatesQuery.data.rates).toHaveLength(1);
    });
    expect(result.current.payrollSubjectRatesQuery.data.rates).toHaveLength(1);

    await act(async () => {
      result.current.loadMoreTeacherRates();
    });
    await waitFor(() => {
      expect(result.current.payrollTeacherRatesQuery.data.rates).toHaveLength(2);
    });
  });
});
