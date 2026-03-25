import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../../../lib/apiClient';
import { saveDownloadedFile } from '../../../../../lib/downloadUtils';
import {
  useAddPayrollAdjustmentMutation,
  useApprovePayrollRunMutation,
  useExportPayrollRunExcelMutation,
  useGeneratePayrollRunMutation,
  usePayPayrollItemMutation,
  usePayPayrollRunMutation,
  useReversePayrollRunMutation,
  useRunPayrollAutomationMutation,
} from '../../../../../services/api/payrollApi';
import {
  formatOwnerName,
  parseOwnerKey,
} from './payrollSectionModel';

export default function usePayrollRunActions({
  t,
  askConfirm,
  periodMonth,
  setRunFilters,
  setSelectedRunId,
  payrollRunsQuery,
  payrollAutomationHealthQuery,
  payrollMonthlyReportQuery,
  activeRunId,
  selectedRun,
  lineOwnerFilter,
  lineFilters,
  adjustmentForm,
  setAdjustmentForm,
  setAdjustmentDrawerOpen,
  payForm,
  payItemModal,
  setPayItemModal,
  payItemForm,
  setPayItemForm,
  reverseReason,
  setReverseReason,
  automationForm,
}) {
  const [generatePayrollRun, generatePayrollRunState] = useGeneratePayrollRunMutation();
  const [runPayrollAutomation, runPayrollAutomationState] = useRunPayrollAutomationMutation();
  const [addPayrollAdjustment, addAdjustmentState] = useAddPayrollAdjustmentMutation();
  const [approvePayrollRun, approvePayrollRunState] = useApprovePayrollRunMutation();
  const [payPayrollRun, payPayrollRunState] = usePayPayrollRunMutation();
  const [payPayrollItem, payPayrollItemState] = usePayPayrollItemMutation();
  const [reversePayrollRun, reversePayrollRunState] = useReversePayrollRunMutation();
  const [exportPayrollRunExcel, exportPayrollRunExcelState] = useExportPayrollRunExcelMutation();

  const isRunBusy =
    generatePayrollRunState.isLoading ||
    runPayrollAutomationState.isLoading ||
    addAdjustmentState.isLoading ||
    approvePayrollRunState.isLoading ||
    payPayrollRunState.isLoading ||
    payPayrollItemState.isLoading ||
    reversePayrollRunState.isLoading ||
    exportPayrollRunExcelState.isLoading;

  async function handleGenerateRun() {
    if (!periodMonth) {
      toast.error(t('Oy tanlang'));
      return;
    }
    try {
      const res = await generatePayrollRun({ periodMonth }).unwrap();
      toast.success(t("Oylik hisob-kitobi yaratildi"));
      setRunFilters((prev) => ({ ...prev, periodMonth, page: 1 }));
      if (res?.run?.id) {
        setSelectedRunId(res.run.id);
      }
    } catch (error) {
      const payload = error?.data?.error?.meta || error?.data?.meta;
      if (payload?.totalMissing) {
        toast.error(
          t("Soat narxi topilmagan darslar bor: {{count}} ta", {
            count: payload.totalMissing,
            defaultValue: `Soat narxi topilmagan darslar bor: ${payload.totalMissing} ta`,
          }),
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  async function handleAddAdjustment() {
    if (!activeRunId) {
      toast.error(t("Hisob-kitobni tanlang"));
      return;
    }
    const ownerFilter = parseOwnerKey(adjustmentForm.ownerKey);
    if (!ownerFilter.teacherId && !ownerFilter.employeeId) {
      toast.error(t("Xodim yoki o'qituvchi tanlang"));
      return;
    }
    try {
      await addPayrollAdjustment({
        runId: activeRunId,
        payload: {
          ...ownerFilter,
          type: adjustmentForm.type,
          amount: Number(adjustmentForm.amount),
          description: adjustmentForm.description,
        },
      }).unwrap();
      toast.success(t("Tuzatma qo'shildi"));
      setAdjustmentForm((prev) => ({ ...prev, amount: '', description: '' }));
      setAdjustmentDrawerOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleApproveRun = useCallback(async () => {
    if (!activeRunId) return;
    const ok = await askConfirm({
      title: t("Hisob-kitobni tasdiqlash"),
      message: t("Hisob-kitobni tasdiqlaysizmi?"),
      confirmLabel: t('Tasdiqlash'),
      confirmVariant: 'success',
    });
    if (!ok) return;
    try {
      await approvePayrollRun(activeRunId).unwrap();
      toast.success(t("Hisob-kitob tasdiqlandi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [activeRunId, approvePayrollRun, askConfirm, t]);

  const handlePayRun = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await payPayrollRun({
        runId: activeRunId,
        payload: {
          paymentMethod: payForm.paymentMethod,
          ...(payForm.paidAt ? { paidAt: payForm.paidAt } : {}),
          ...(payForm.externalRef ? { externalRef: payForm.externalRef } : {}),
          ...(payForm.note ? { note: payForm.note } : {}),
        },
      }).unwrap();
      toast.success(t("Hisob-kitob to'landi (to'langan holat)"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [activeRunId, payPayrollRun, payForm, t]);

  const openPayItemModal = useCallback((row) => {
    const snapshotName = `${row.teacherFirstNameSnapshot || ''} ${row.teacherLastNameSnapshot || ''}`.trim();
    const ownerLabel = formatOwnerName({
      teacher: row.teacher,
      employee: row.employee,
      fallbackName: snapshotName,
      fallbackId: row.teacherId || row.employeeId || '',
    });
    const payableAmount = Math.max(0, Number(row.payableAmount || 0));
    const paidAmount = Number(row.paidAmount || 0);
    const remaining = Math.max(0, payableAmount - paidAmount);
    setPayItemModal({
      open: true,
      itemId: row.id,
      ownerLabel,
      payableAmount,
      paidAmount,
    });
    setPayItemForm((prev) => ({
      ...prev,
      amount: remaining > 0 ? String(remaining) : '',
    }));
  }, [setPayItemForm, setPayItemModal]);

  const closePayItemModal = useCallback(() => {
    setPayItemModal({
      open: false,
      itemId: '',
      ownerLabel: '',
      payableAmount: 0,
      paidAmount: 0,
    });
    setPayItemForm({
      amount: '',
      paymentMethod: 'BANK',
      paidAt: '',
      externalRef: '',
      note: '',
    });
  }, [setPayItemForm, setPayItemModal]);

  async function handlePayItem() {
    if (!activeRunId || !payItemModal.itemId) return;
    if (!payItemForm.amount) {
      toast.error(t("To'lov summasini kiriting"));
      return;
    }
    try {
      await payPayrollItem({
        runId: activeRunId,
        itemId: payItemModal.itemId,
        payload: {
          amount: Number(payItemForm.amount),
          paymentMethod: payItemForm.paymentMethod,
          ...(payItemForm.paidAt ? { paidAt: payItemForm.paidAt } : {}),
          ...(payItemForm.externalRef ? { externalRef: payItemForm.externalRef } : {}),
          ...(payItemForm.note ? { note: payItemForm.note } : {}),
        },
      }).unwrap();
      toast.success(t("Xodim bo'yicha to'lov qayd etildi"));
      closePayItemModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleReverseRun() {
    if (!activeRunId) return;
    try {
      await reversePayrollRun({
        runId: activeRunId,
        payload: { reason: reverseReason },
      }).unwrap();
      toast.success(t("Hisob-kitob bekor qilindi"));
      setReverseReason('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleExportRunExcel() {
    if (!activeRunId) {
      toast.error(t("Hisob-kitobni tanlang"));
      return;
    }
    try {
      const result = await exportPayrollRunExcel({
        runId: activeRunId,
        params: {
          ...(lineOwnerFilter.teacherId ? { teacherId: lineOwnerFilter.teacherId } : {}),
          ...(lineOwnerFilter.employeeId ? { employeeId: lineOwnerFilter.employeeId } : {}),
          ...(lineFilters.type ? { type: lineFilters.type } : {}),
        },
      }).unwrap();
      const fallbackName = `payroll-${selectedRun?.periodMonth || 'run'}.xlsx`;
      saveDownloadedFile({ blob: result.blob, fileName: result.fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: 'Excel' }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function buildAutomationPayload({ dryRun = false } = {}) {
    const payload = {
      periodMonth,
      generate: true,
      autoApprove: true,
      autoPay: false,
      force: Boolean(automationForm.force),
      dryRun,
    };

    if (automationForm.mode === 'GENERATE_ONLY') {
      payload.autoApprove = false;
      payload.autoPay = false;
      return payload;
    }
    if (automationForm.mode === 'FULL_PAY') {
      payload.autoApprove = true;
      payload.autoPay = true;
      payload.paymentMethod = automationForm.paymentMethod || 'BANK';
      return payload;
    }

    return payload;
  }

  async function handleRunAutomation({ dryRun = false } = {}) {
    if (!periodMonth) {
      toast.error(t('Oy tanlang'));
      return;
    }

    try {
      const result = await runPayrollAutomation(buildAutomationPayload({ dryRun })).unwrap();
      const doneSteps = (result?.steps || [])
        .filter((step) => step.status === 'DONE')
        .map((step) => step.step)
        .join(' -> ');
      if (dryRun) {
        toast.success(
          doneSteps
            ? t("Sinov rejimi yakunlandi: {{steps}}", { steps: doneSteps })
            : t("Sinov rejimi yakunlandi"),
        );
      } else {
        toast.success(
          doneSteps
            ? t("Avto jarayon yakunlandi: {{steps}}", { steps: doneSteps })
            : t("Avto jarayon yakunlandi"),
        );
      }
      setRunFilters((prev) => ({ ...prev, periodMonth, page: 1 }));
      if (result?.run?.id) {
        setSelectedRunId(result.run.id);
      }
      payrollRunsQuery.refetch();
      payrollAutomationHealthQuery.refetch();
      payrollMonthlyReportQuery.refetch();
    } catch (error) {
      const blockerCount = Number(error?.data?.error?.meta?.health?.summary?.blockerCount || 0);
      if (error?.data?.error?.code === 'PAYROLL_AUTOMATION_BLOCKED' && blockerCount > 0) {
        toast.error(
          t("Avto jarayon to'xtadi. To'siqlar soni: {{count}}", { count: blockerCount }),
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  }

  return {
    isRunBusy,
    handleGenerateRun,
    handleAddAdjustment,
    handleApproveRun,
    handlePayRun,
    openPayItemModal,
    closePayItemModal,
    handlePayItem,
    handleReverseRun,
    handleExportRunExcel,
    handleRunAutomation,
  };
}
