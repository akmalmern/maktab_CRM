import { currentMonthKey } from './managerDebtorsModel';
import {
  createImtiyozForm,
  createPaymentForm,
} from './managerDebtorsState';

export function firstManagerDebtMonth(row) {
  return row?.qarzOylar?.[0] || currentMonthKey();
}

export function buildManagerPaymentPreviewPayload(paymentForm) {
  if (!paymentForm?.startMonth) return null;

  return {
    turi: paymentForm.turi,
    startMonth: paymentForm.startMonth,
    oylarSoni: paymentForm.turi === 'YILLIK' ? 12 : Number(paymentForm.oylarSoni || 1),
    ...(paymentForm.summa !== '' ? { summa: Number(paymentForm.summa) } : {}),
    ...(paymentForm.izoh ? { izoh: paymentForm.izoh } : {}),
  };
}

export function buildManagerPaymentMutationPayload(paymentForm, paymentRequestKey) {
  const previewPayload = buildManagerPaymentPreviewPayload(paymentForm);
  if (!previewPayload) return null;

  return {
    ...previewPayload,
    idempotencyKey: paymentRequestKey,
  };
}

export function buildManagerImtiyozMutationPayload(imtiyozForm) {
  return {
    turi: imtiyozForm.turi,
    boshlanishOy: imtiyozForm.boshlanishOy,
    oylarSoni: Number(imtiyozForm.oylarSoni || 1),
    ...(imtiyozForm.qiymat !== '' && imtiyozForm.turi !== 'TOLIQ_OZOD'
      ? { qiymat: Number(imtiyozForm.qiymat) }
      : {}),
    sabab: imtiyozForm.sabab,
    ...(imtiyozForm.izoh ? { izoh: imtiyozForm.izoh } : {}),
  };
}

export function buildManagerPaymentModalState(row) {
  const startMonth = firstManagerDebtMonth(row);

  return {
    startMonth,
    paymentForm: createPaymentForm(startMonth),
    imtiyozForm: createImtiyozForm(startMonth),
  };
}
