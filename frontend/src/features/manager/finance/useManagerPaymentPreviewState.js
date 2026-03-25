import { useMemo } from 'react';
import { usePreviewManagerPaymentMutation } from '../../../services/api/managerApi';
import { useDebouncedPaymentPreview } from '../../shared/finance/useDebouncedPaymentPreview';
import {
  buildManagerPaymentPreview,
  mergeManagerServerPaymentPreview,
} from './managerDebtorsModel';
import { buildManagerPaymentPreviewPayload } from './managerPaymentPayloads';

export default function useManagerPaymentPreviewState({
  paymentModalOpen,
  paymentModalTab,
  paymentStudentId,
  paymentForm,
  paymentState,
}) {
  const [previewManagerPayment] = usePreviewManagerPaymentMutation();

  const localPaymentPreview = useMemo(
    () => buildManagerPaymentPreview(paymentState.student, paymentForm),
    [paymentForm, paymentState.student],
  );
  const managerPreviewPayload = useMemo(
    () => buildManagerPaymentPreviewPayload(paymentForm),
    [paymentForm],
  );

  const serverPreviewState = useDebouncedPaymentPreview({
    enabled: paymentModalOpen && paymentModalTab === 'payment' && Boolean(paymentStudentId),
    studentId: paymentStudentId,
    payload: managerPreviewPayload,
    requestPreview: ({ studentId, payload }) =>
      previewManagerPayment({ studentId, payload }).unwrap(),
    debounceMs: 300,
  });

  const mergedPaymentPreview = useMemo(() => {
    if (!localPaymentPreview) return null;
    return mergeManagerServerPaymentPreview(localPaymentPreview, serverPreviewState.data);
  }, [localPaymentPreview, serverPreviewState.data]);

  return {
    mergedPaymentPreview,
    serverPreviewState,
  };
}
