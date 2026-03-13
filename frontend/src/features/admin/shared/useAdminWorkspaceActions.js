import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../../../lib/apiClient';
import { saveDownloadedFile } from '../../../lib/downloadUtils';
import { normalizeFinanceQuery, syncFinanceSearchParams } from './adminWorkspaceFinanceState';

export default function useAdminWorkspaceActions({
  t,
  navigate,
  askConfirm,
  setExporting,
  deleteStudentMutation,
  createTeacherMutation,
  createStudentMutation,
  exportAttendanceReport,
  updateFinanceSettings,
  fetchFinanceDetail,
  createFinancePayment,
  createFinanceImtiyoz,
  deactivateFinanceImtiyoz,
  rollbackFinanceTarif,
  revertFinancePayment,
  exportFinanceDebtors,
  financeSettingsQuery,
  financeStudentsQuery,
  financeQuery,
  isFinanceSection,
  searchParams,
  setSearchParams,
  setFinanceQuery,
  createRequestIdempotencyKey,
}) {
  const handleDeleteStudent = useCallback(async (id) => {
    const ok = await askConfirm(t('Student ni o`chirmoqchimisiz?'), t("Studentni o'chirish"));
    if (!ok) return false;

    try {
      await deleteStudentMutation(id).unwrap();
      toast.success(t('Student o`chirildi'));
      return true;
    } catch (error) {
      toast.error(error?.message || t('Student o`chirilmadi'));
      return false;
    }
  }, [askConfirm, deleteStudentMutation, t]);

  const handleCreateTeacher = useCallback(async (form) => {
    try {
      const payload = await createTeacherMutation(form).unwrap();
      const teacherId = payload?.teacherId;
      toast.success(t('Teacher muvaffaqiyatli yaratildi'));
      if (teacherId) {
        navigate(`/admin/teachers/${teacherId}`);
      }
      return true;
    } catch (error) {
      toast.error(error?.message || t('Teacher yaratilmadi'));
      return false;
    }
  }, [createTeacherMutation, navigate, t]);

  const handleCreateStudent = useCallback(async (form) => {
    try {
      const payload = await createStudentMutation(form).unwrap();
      const studentId = payload?.studentId;
      toast.success(t('Student muvaffaqiyatli yaratildi'));
      if (studentId) {
        navigate(`/admin/students/${studentId}`);
      }
      return true;
    } catch (error) {
      toast.error(error?.message || t('Student yaratilmadi'));
      return false;
    }
  }, [createStudentMutation, navigate, t]);

  const handleExportAttendance = useCallback(async (format, params) => {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportAttendanceReport({ format: safeFormat, params }).unwrap();
      const datePart = params?.sana || new Date().toISOString().slice(0, 10);
      const fallbackName = `davomat-hisobot-${datePart}.${safeFormat}`;
      saveDownloadedFile({ blob, fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }, [exportAttendanceReport, setExporting, t]);

  const handleSaveFinanceSettings = useCallback(async (payload) => {
    try {
      await updateFinanceSettings(payload).unwrap();
      toast.success(t('Tarif rejalandi'));
      financeSettingsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif saqlanmadi'));
      financeSettingsQuery.refetch();
      return false;
    }
  }, [financeSettingsQuery, t, updateFinanceSettings]);

  const handleOpenFinanceDetail = useCallback(async (studentId) => {
    try {
      await fetchFinanceDetail(studentId).unwrap();
    } catch (error) {
      toast.error(error?.message || t("Student to'lov ma'lumotlari olinmadi"));
    }
  }, [fetchFinanceDetail, t]);

  const handleCreateFinancePayment = useCallback(async (studentId, payload) => {
    try {
      await createFinancePayment({
        studentId,
        payload: {
          ...payload,
          idempotencyKey: payload?.idempotencyKey || createRequestIdempotencyKey(),
        },
      }).unwrap();
      toast.success(t("To'lov saqlandi"));
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov saqlanmadi"));
      return false;
    }
  }, [createFinancePayment, createRequestIdempotencyKey, t]);

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
    const ok = await askConfirm(
      t("Tanlangan tarifni rollback qilmoqchimisiz?"),
      t('Tarif rollback'),
    );
    if (!ok) return false;
    try {
      await rollbackFinanceTarif({ tarifId }).unwrap();
      toast.success(t('Tarif rollback qilindi'));
      financeSettingsQuery.refetch();
      financeStudentsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t('Tarif rollback qilinmadi'));
      return false;
    }
  }, [askConfirm, financeSettingsQuery, financeStudentsQuery, rollbackFinanceTarif, t]);

  const handleRevertFinancePayment = useCallback(async (tolovId) => {
    const ok = await askConfirm(
      t("To'lov tranzaksiyasini bekor qilmoqchimisiz?"),
      t("To'lovni bekor qilish"),
    );
    if (!ok) return false;
    try {
      await revertFinancePayment(tolovId).unwrap();
      toast.success(t("To'lov bekor qilindi"));
      financeStudentsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t("To'lov bekor qilinmadi"));
      return false;
    }
  }, [askConfirm, financeStudentsQuery, revertFinancePayment, t]);

  const handleExportFinanceDebtors = useCallback(async (format) => {
    const safeFormat = format === 'xlsx' ? 'xlsx' : 'pdf';
    setExporting(safeFormat);
    try {
      const { blob, fileName } = await exportFinanceDebtors({
        format: safeFormat,
        params: {
          search: financeQuery.search || undefined,
          classroomId: financeQuery.classroomId === 'all' ? undefined : financeQuery.classroomId,
        },
      }).unwrap();
      const fallbackName = `moliya-qarzdorlar.${safeFormat}`;
      saveDownloadedFile({ blob, fileName, fallbackName });
      toast.success(t('{{format}} fayl yuklab olindi', { format: safeFormat.toUpperCase() }));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting('');
    }
  }, [exportFinanceDebtors, financeQuery.classroomId, financeQuery.search, setExporting, t]);

  const handleFinanceQueryChange = useCallback((patch) => {
    setFinanceQuery((prev) => {
      const next = normalizeFinanceQuery({ ...prev, ...patch });
      if (isFinanceSection) {
        const nextParams = syncFinanceSearchParams(searchParams, next);
        if (nextParams.toString() !== searchParams.toString()) {
          setSearchParams(nextParams, { replace: true });
        }
      }
      return next;
    });
  }, [isFinanceSection, searchParams, setFinanceQuery, setSearchParams]);

  return {
    handleDeleteStudent,
    handleCreateTeacher,
    handleCreateStudent,
    handleExportAttendance,
    handleSaveFinanceSettings,
    handleOpenFinanceDetail,
    handleCreateFinancePayment,
    handleCreateFinanceImtiyoz,
    handleDeactivateFinanceImtiyoz,
    handleRollbackFinanceTarif,
    handleRevertFinancePayment,
    handleExportFinanceDebtors,
    handleFinanceQueryChange,
  };
}
