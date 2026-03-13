import { describe, expect, it, vi } from 'vitest';
import { resolveRunPrimaryAction } from './runActions';

function buildArgs(overrides = {}) {
  return {
    selectedRun: { status: 'DRAFT' },
    isAdminView: true,
    isManagerView: false,
    canApproveSelectedRun: true,
    canPaySelectedRun: true,
    busy: false,
    labels: {
      approve: 'Tasdiqlash',
      payAll: "Barchasini to'lash",
      downloadExcel: "Yuklab olish (Excel)",
    },
    handlers: {
      onApprove: vi.fn(),
      onPay: vi.fn(),
      onExportExcel: vi.fn(),
    },
    ...overrides,
  };
}

describe('resolveRunPrimaryAction', () => {
  it('returns null when selected run is missing', () => {
    const action = resolveRunPrimaryAction(buildArgs({ selectedRun: null }));
    expect(action).toBeNull();
  });

  it('returns approve action for DRAFT run', () => {
    const action = resolveRunPrimaryAction(buildArgs());
    expect(action?.label).toBe('Tasdiqlash');
    expect(action?.variant).toBe('indigo');
    expect(action?.disabled).toBe(false);
  });

  it('returns pay-all action for APPROVED run in admin view', () => {
    const action = resolveRunPrimaryAction(
      buildArgs({ selectedRun: { status: 'APPROVED' } }),
    );
    expect(action?.label).toBe("Barchasini to'lash");
    expect(action?.variant).toBe('success');
  });

  it('does not show pay-all action for manager in APPROVED run', () => {
    const action = resolveRunPrimaryAction(
      buildArgs({
        selectedRun: { status: 'APPROVED' },
        isAdminView: false,
        isManagerView: true,
      }),
    );
    expect(action).toBeNull();
  });

  it('returns excel action for PAID run', () => {
    const action = resolveRunPrimaryAction(
      buildArgs({ selectedRun: { status: 'PAID' } }),
    );
    expect(action?.label).toBe("Yuklab olish (Excel)");
    expect(action?.variant).toBe('secondary');
  });

  it('returns null when no primary action exists', () => {
    const action = resolveRunPrimaryAction(
      buildArgs({ selectedRun: { status: 'REVERSED' } }),
    );
    expect(action).toBeNull();
  });

  it('disables action when busy is true', () => {
    const draftAction = resolveRunPrimaryAction(buildArgs({ busy: true }));
    expect(draftAction?.disabled).toBe(true);

    const paidAction = resolveRunPrimaryAction(
      buildArgs({ selectedRun: { status: 'PAID' }, busy: true }),
    );
    expect(paidAction?.disabled).toBe(true);
  });
});
