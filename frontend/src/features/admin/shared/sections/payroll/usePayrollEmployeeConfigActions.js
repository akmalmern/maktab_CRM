import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../../../lib/apiClient';
import { useUpdatePayrollEmployeeConfigMutation } from '../../../../../services/api/payrollApi';
import { formatEmployeeConfigName } from './payrollSectionModel';

export default function usePayrollEmployeeConfigActions({
  t,
  employeeConfigModal,
  setEmployeeConfigModal,
}) {
  const [updatePayrollEmployeeConfig, updatePayrollEmployeeConfigState] = useUpdatePayrollEmployeeConfigMutation();

  const isEmployeeConfigBusy = updatePayrollEmployeeConfigState.isLoading;

  const openEmployeeConfigModal = useCallback((row) => {
    const fixedSalary = row?.fixedSalaryAmount == null ? '' : String(Number(row.fixedSalaryAmount || 0));
    setEmployeeConfigModal({
      open: true,
      employeeId: row.id,
      displayName: formatEmployeeConfigName(row),
      payrollMode: row.payrollMode || 'LESSON_BASED',
      fixedSalaryAmount: fixedSalary,
      isPayrollEligible: Boolean(row.isPayrollEligible),
      employmentStatus: row.employmentStatus || 'ACTIVE',
      note: row.note || '',
    });
  }, [setEmployeeConfigModal]);

  const closeEmployeeConfigModal = useCallback(() => {
    setEmployeeConfigModal({
      open: false,
      employeeId: '',
      displayName: '',
      payrollMode: 'LESSON_BASED',
      fixedSalaryAmount: '',
      isPayrollEligible: true,
      employmentStatus: 'ACTIVE',
      note: '',
    });
  }, [setEmployeeConfigModal]);

  async function handleSaveEmployeeConfig() {
    if (!employeeConfigModal.employeeId) return;

    const hasFixedSalaryValue = String(employeeConfigModal.fixedSalaryAmount || '').trim() !== '';
    const fixedSalaryAmount = hasFixedSalaryValue ? Number(employeeConfigModal.fixedSalaryAmount) : null;
    if (hasFixedSalaryValue && (!Number.isFinite(fixedSalaryAmount) || fixedSalaryAmount < 0)) {
      toast.error(t("Oklad summasi noto'g'ri"));
      return;
    }
    if (
      ['FIXED', 'MIXED'].includes(employeeConfigModal.payrollMode)
      && (!Number.isFinite(fixedSalaryAmount) || fixedSalaryAmount <= 0)
    ) {
      toast.error(t("FIXED/MIXED rejimda oklad summasi musbat bo'lishi shart"));
      return;
    }

    try {
      await updatePayrollEmployeeConfig({
        employeeId: employeeConfigModal.employeeId,
        payload: {
          payrollMode: employeeConfigModal.payrollMode,
          fixedSalaryAmount,
          ...(employeeConfigModal.payrollMode !== 'MANUAL_ONLY'
            ? { isPayrollEligible: Boolean(employeeConfigModal.isPayrollEligible) }
            : {}),
          note: employeeConfigModal.note || '',
        },
      }).unwrap();
      toast.success(t("Oylik konfiguratsiyasi saqlandi"));
      closeEmployeeConfigModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return {
    isEmployeeConfigBusy,
    openEmployeeConfigModal,
    closeEmployeeConfigModal,
    handleSaveEmployeeConfig,
  };
}
