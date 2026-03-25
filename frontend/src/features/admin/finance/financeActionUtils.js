export function createRequestIdempotencyKey() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${hex()}-${hex().slice(0, 4)}-4${hex().slice(0, 3)}-a${hex().slice(0, 3)}-${hex()}${hex().slice(0, 4)}`;
}

export function buildFinancePaymentPayload(payload) {
  return {
    ...payload,
    idempotencyKey: payload?.idempotencyKey || createRequestIdempotencyKey(),
  };
}

export function buildFinanceDebtorsExportParams(financeQuery) {
  return {
    search: financeQuery.search || undefined,
    classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
  };
}

export function resolveFinanceExportFormat(format) {
  return format === 'xlsx' ? 'xlsx' : 'pdf';
}
