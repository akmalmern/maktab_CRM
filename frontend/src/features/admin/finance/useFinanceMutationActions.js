import { useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  useCreateFinanceImtiyozMutation,
  useCreateFinancePaymentMutation,
  useDeactivateFinanceImtiyozMutation,
  useRevertFinancePaymentMutation,
  useRollbackFinanceTarifMutation,
  useUpdateFinanceSettingsMutation,
} from '../../../services/api/financeApi';
import { buildFinancePaymentPayload } from './financeActionUtils';

export default function useFinanceMutationActions({ t, askConfirm }) {
  const [updateFinanceSettings, updateFinanceSettingsState] = useUpdateFinanceSettingsMutation();
  const [createFinancePayment, createFinancePaymentState] = useCreateFinancePaymentMutation();
  const [createFinanceImtiyoz, createFinanceImtiyozState] = useCreateFinanceImtiyozMutation();
  const [deactivateFinanceImtiyoz, deactivateFinanceImtiyozState] =
    useDeactivateFinanceImtiyozMutation();
  const [rollbackFinanceTarif, rollbackFinanceTarifState] = useRollbackFinanceTarifMutation();
  const [revertFinancePayment, revertFinancePaymentState] = useRevertFinancePaymentMutation();

  const handleSaveFinanceSettings = useCallback(async (payload) => {
    try {
      await updateFinanceSettings(payload).unwrap();
      toast.success(t('Tarif rejalandi'));
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif saqlanmadi'));
      return false;
    }
  }, [t, updateFinanceSettings]);

  const handleCreateFinancePayment = useCallback(async (studentId, payload) => {
    try {
      await createFinancePayment({
        studentId,
        payload: buildFinancePaymentPayload(payload),
      }).unwrap();
      toast.success(t("To'lov saqlandi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
      return false;
    }
  }, [createFinancePayment, t]);

  const handleCreateFinanceImtiyoz = useCallback(async (studentId, payload) => {
    try {
      await createFinanceImtiyoz({ studentId, payload }).unwrap();
      toast.success(t("Imtiyoz saqlandi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz saqlanmadi"));
      return false;
    }
  }, [createFinanceImtiyoz, t]);

  const handleDeactivateFinanceImtiyoz = useCallback(async (imtiyozId, payload) => {
    try {
      await deactivateFinanceImtiyoz({ imtiyozId, payload }).unwrap();
      toast.success(t("Imtiyoz bekor qilindi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("Imtiyoz bekor qilinmadi"));
      return false;
    }
  }, [deactivateFinanceImtiyoz, t]);

  const handleRollbackFinanceTarif = useCallback(async (tarifId) => {
    const ok = await askConfirm({
      title: t('Tarif rollback'),
      message: t("Tanlangan tarifni rollback qilmoqchimisiz?"),
    });
    if (!ok) return false;

    try {
      await rollbackFinanceTarif({ tarifId }).unwrap();
      toast.success(t('Tarif rollback qilindi'));
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif rollback qilinmadi'));
      return false;
    }
  }, [askConfirm, rollbackFinanceTarif, t]);

  const handleRevertFinancePayment = useCallback(async (tolovId) => {
    const ok = await askConfirm({
      title: t("To'lovni bekor qilish"),
      message: t("To'lov tranzaksiyasini bekor qilmoqchimisiz?"),
    });
    if (!ok) return false;

    try {
      await revertFinancePayment(tolovId).unwrap();
      toast.success(t("To'lov bekor qilindi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov bekor qilinmadi"));
      return false;
    }
  }, [askConfirm, revertFinancePayment, t]);

  return {
    financeActionLoading:
      updateFinanceSettingsState.isLoading ||
      createFinancePaymentState.isLoading ||
      createFinanceImtiyozState.isLoading ||
      deactivateFinanceImtiyozState.isLoading ||
      rollbackFinanceTarifState.isLoading ||
      revertFinancePaymentState.isLoading,
    handleSaveFinanceSettings,
    handleCreateFinancePayment,
    handleCreateFinanceImtiyoz,
    handleDeactivateFinanceImtiyoz,
    handleRollbackFinanceTarif,
    handleRevertFinancePayment,
  };
}
