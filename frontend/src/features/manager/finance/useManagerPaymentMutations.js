import { toast } from 'react-toastify';
import {
  useCreateManagerImtiyozMutation,
  useCreateManagerPaymentMutation,
  useDeactivateManagerImtiyozMutation,
  useRevertManagerPaymentMutation,
} from '../../../services/api/managerApi';
import { createClientRequestKey } from './managerDebtorsModel';
import {
  buildManagerImtiyozMutationPayload,
  buildManagerPaymentMutationPayload,
} from './managerPaymentPayloads';

export default function useManagerPaymentMutations({
  t,
  paymentStudentId,
  paymentForm,
  imtiyozForm,
  paymentRequestKey,
  setPaymentRequestKey,
  setPaymentForm,
  setImtiyozForm,
}) {
  const [createManagerPayment, createManagerPaymentState] = useCreateManagerPaymentMutation();
  const [createManagerImtiyoz, createManagerImtiyozState] = useCreateManagerImtiyozMutation();
  const [deactivateManagerImtiyoz, deactivateManagerImtiyozState] =
    useDeactivateManagerImtiyozMutation();
  const [revertManagerPayment, revertManagerPaymentState] = useRevertManagerPaymentMutation();

  async function handleSubmitPayment(event) {
    event?.preventDefault?.();
    if (!paymentStudentId) return;

    const payload = buildManagerPaymentMutationPayload(paymentForm, paymentRequestKey);
    if (!payload) return;

    try {
      await createManagerPayment({
        studentId: paymentStudentId,
        payload,
      }).unwrap();
      toast.success(t("To'lov saqlandi"));
      setPaymentRequestKey(createClientRequestKey());
      setPaymentForm((prev) => ({ ...prev, summa: '', izoh: '' }));
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
    }
  }

  async function handleCreateImtiyoz(event) {
    event?.preventDefault?.();
    if (!paymentStudentId) return;

    try {
      await createManagerImtiyoz({
        studentId: paymentStudentId,
        payload: buildManagerImtiyozMutationPayload(imtiyozForm),
      }).unwrap();
      toast.success(t("Imtiyoz saqlandi"));
      setImtiyozForm((prev) => ({ ...prev, qiymat: '', sabab: '', izoh: '' }));
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz saqlanmadi"));
    }
  }

  async function handleDeactivateImtiyoz(imtiyozId) {
    if (!imtiyozId || !paymentStudentId) return;

    try {
      await deactivateManagerImtiyoz({ imtiyozId, payload: {} }).unwrap();
      toast.success(t("Imtiyoz bekor qilindi"));
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz bekor qilinmadi"));
    }
  }

  async function handleRevertPayment(tolovId) {
    if (!tolovId || !paymentStudentId) return;

    try {
      await revertManagerPayment(tolovId).unwrap();
      toast.success(t("To'lov saqlandi"));
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
    }
  }

  return {
    paymentActionLoading:
      createManagerPaymentState.isLoading ||
      createManagerImtiyozState.isLoading ||
      deactivateManagerImtiyozState.isLoading ||
      revertManagerPaymentState.isLoading,
    handleSubmitPayment,
    handleCreateImtiyoz,
    handleDeactivateImtiyoz,
    handleRevertPayment,
  };
}
