import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../../../lib/apiClient';
import {
  useCreatePayrollSubjectRateMutation,
  useCreatePayrollTeacherRateMutation,
  useDeletePayrollSubjectRateMutation,
  useDeletePayrollTeacherRateMutation,
  useUpdatePayrollSubjectRateMutation,
  useUpdatePayrollTeacherRateMutation,
} from '../../../../../services/api/payrollApi';
import { toDateInput } from './payrollSectionModel';

export default function usePayrollRatesActions({
  t,
  askConfirm,
  teacherRateForm,
  setTeacherRateForm,
  subjectRateForm,
  setSubjectRateForm,
  setRateCreateDrawer,
  rateEditModal,
  setRateEditModal,
}) {
  const [createPayrollTeacherRate, createTeacherRateState] = useCreatePayrollTeacherRateMutation();
  const [updatePayrollTeacherRate, updateTeacherRateState] = useUpdatePayrollTeacherRateMutation();
  const [deletePayrollTeacherRate, deleteTeacherRateState] = useDeletePayrollTeacherRateMutation();
  const [createPayrollSubjectRate, createSubjectRateState] = useCreatePayrollSubjectRateMutation();
  const [updatePayrollSubjectRate, updateSubjectRateState] = useUpdatePayrollSubjectRateMutation();
  const [deletePayrollSubjectRate, deleteSubjectRateState] = useDeletePayrollSubjectRateMutation();

  const ratesReloadKey = [
    createTeacherRateState.isSuccess,
    updateTeacherRateState.isSuccess,
    deleteTeacherRateState.isSuccess,
    createSubjectRateState.isSuccess,
    updateSubjectRateState.isSuccess,
    deleteSubjectRateState.isSuccess,
  ].join(':');

  const isRatesBusy =
    createTeacherRateState.isLoading ||
    updateTeacherRateState.isLoading ||
    deleteTeacherRateState.isLoading ||
    createSubjectRateState.isLoading ||
    updateSubjectRateState.isLoading ||
    deleteSubjectRateState.isLoading;

  async function handleCreateTeacherRate() {
    try {
      await createPayrollTeacherRate({
        teacherId: teacherRateForm.teacherId,
        subjectId: teacherRateForm.subjectId,
        ratePerHour: Number(teacherRateForm.ratePerHour),
        effectiveFrom: teacherRateForm.effectiveFrom,
        ...(teacherRateForm.effectiveTo ? { effectiveTo: teacherRateForm.effectiveTo } : {}),
        ...(teacherRateForm.note ? { note: teacherRateForm.note } : {}),
      }).unwrap();
      toast.success(t("O'qituvchi stavkasi saqlandi"));
      setTeacherRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteTeacherRate = useCallback(async (rateId) => {
    const ok = await askConfirm({
      title: t("O'qituvchi stavkasini o'chirish"),
      message: t("O'qituvchi stavkasini o'chirmoqchimisiz?"),
    });
    if (!ok) return;
    try {
      await deletePayrollTeacherRate(rateId).unwrap();
      toast.success(t("O'qituvchi stavkasi o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [askConfirm, deletePayrollTeacherRate, t]);

  async function handleCreateSubjectRate() {
    try {
      await createPayrollSubjectRate({
        subjectId: subjectRateForm.subjectId,
        ratePerHour: Number(subjectRateForm.ratePerHour),
        effectiveFrom: subjectRateForm.effectiveFrom,
        ...(subjectRateForm.effectiveTo ? { effectiveTo: subjectRateForm.effectiveTo } : {}),
        ...(subjectRateForm.note ? { note: subjectRateForm.note } : {}),
      }).unwrap();
      toast.success(t("Fan bo'yicha standart stavka saqlandi"));
      setSubjectRateForm((prev) => ({ ...prev, ratePerHour: '', note: '' }));
      setRateCreateDrawer((prev) => ({ ...prev, open: false }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const handleDeleteSubjectRate = useCallback(async (rateId) => {
    const ok = await askConfirm({
      title: t("Fan stavkasini o'chirish"),
      message: t("Fan bo'yicha standart stavkani o'chirmoqchimisiz?"),
    });
    if (!ok) return;
    try {
      await deletePayrollSubjectRate(rateId).unwrap();
      toast.success(t("Fan bo'yicha standart stavka o'chirildi"));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [askConfirm, deletePayrollSubjectRate, t]);

  function openRateCreateDrawer(kind) {
    setRateCreateDrawer({ open: true, kind });
  }

  function closeRateCreateDrawer() {
    setRateCreateDrawer((prev) => ({ ...prev, open: false }));
  }

  const openTeacherRateEditModal = useCallback((row) => {
    setRateEditModal({
      open: true,
      kind: 'teacher',
      rateId: row.id,
      teacherId: row.teacherId || '',
      subjectId: row.subjectId || '',
      ratePerHour: String(row.ratePerHour ?? ''),
      effectiveFrom: toDateInput(row.effectiveFrom),
      effectiveTo: toDateInput(row.effectiveTo),
      note: row.note || '',
    });
  }, [setRateEditModal]);

  const openSubjectRateEditModal = useCallback((row) => {
    setRateEditModal({
      open: true,
      kind: 'subject',
      rateId: row.id,
      teacherId: '',
      subjectId: row.subjectId || '',
      ratePerHour: String(row.ratePerHour ?? ''),
      effectiveFrom: toDateInput(row.effectiveFrom),
      effectiveTo: toDateInput(row.effectiveTo),
      note: row.note || '',
    });
  }, [setRateEditModal]);

  function closeRateEditModal() {
    setRateEditModal((prev) => ({ ...prev, open: false }));
  }

  async function handleSubmitRateEdit() {
    if (!rateEditModal.rateId || !rateEditModal.subjectId || !rateEditModal.ratePerHour || !rateEditModal.effectiveFrom) {
      toast.error(t("Majburiy maydonlarni to'ldiring"));
      return;
    }

    try {
      const payload = {
        subjectId: rateEditModal.subjectId,
        ratePerHour: Number(rateEditModal.ratePerHour),
        effectiveFrom: rateEditModal.effectiveFrom,
        ...(rateEditModal.effectiveTo ? { effectiveTo: rateEditModal.effectiveTo } : { effectiveTo: null }),
        ...(rateEditModal.note ? { note: rateEditModal.note } : { note: '' }),
      };

      if (rateEditModal.kind === 'teacher') {
        if (!rateEditModal.teacherId) {
          toast.error(t("O'qituvchi tanlang"));
          return;
        }
        await updatePayrollTeacherRate({
          rateId: rateEditModal.rateId,
          payload: { ...payload, teacherId: rateEditModal.teacherId },
        }).unwrap();
        toast.success(t("O'qituvchi stavkasi yangilandi"));
      } else {
        await updatePayrollSubjectRate({
          rateId: rateEditModal.rateId,
          payload,
        }).unwrap();
        toast.success(t("Fan stavkasi yangilandi"));
      }

      closeRateEditModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return {
    ratesReloadKey,
    isRatesBusy,
    handleCreateTeacherRate,
    handleDeleteTeacherRate,
    handleCreateSubjectRate,
    handleDeleteSubjectRate,
    openRateCreateDrawer,
    closeRateCreateDrawer,
    openTeacherRateEditModal,
    openSubjectRateEditModal,
    closeRateEditModal,
    handleSubmitRateEdit,
  };
}
