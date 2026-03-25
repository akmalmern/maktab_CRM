import { toast } from 'react-toastify';
import useAsyncConfirm from '../../../../../hooks/useAsyncConfirm';
import {
  useCreateAdminDarsJadvaliMutation,
  useCreateAdminVaqtOraliqMutation,
  useDeleteAdminDarsJadvaliMutation,
  useDeleteAdminTeacherWorkloadPlanMutation,
  useDeleteAdminVaqtOraliqMutation,
  useGetAdminDarsJadvaliQuery,
  useGetAdminTeacherWorkloadPlansQuery,
  useGetAdminVaqtOraliqlariQuery,
  useUpsertAdminTeacherWorkloadPlanMutation,
  useUpdateAdminDarsJadvaliMutation,
} from '../../../../../services/api/scheduleApi';
import {
  isScheduleConflictMessage,
  parseScheduleError,
} from './scheduleSectionModel';

export default function useScheduleSectionController({ t }) {
  const { askConfirm, confirmModalProps } = useAsyncConfirm();
  const vaqtQuery = useGetAdminVaqtOraliqlariQuery();
  const darslarQuery = useGetAdminDarsJadvaliQuery();
  const workloadPlansQuery = useGetAdminTeacherWorkloadPlansQuery();
  const [createVaqtOraliq, createVaqtState] = useCreateAdminVaqtOraliqMutation();
  const [deleteVaqtOraliq, deleteVaqtState] = useDeleteAdminVaqtOraliqMutation();
  const [createDars, createDarsState] = useCreateAdminDarsJadvaliMutation();
  const [deleteDars, deleteDarsState] = useDeleteAdminDarsJadvaliMutation();
  const [updateDars, updateDarsState] = useUpdateAdminDarsJadvaliMutation();
  const [upsertWorkloadPlan, upsertWorkloadPlanState] =
    useUpsertAdminTeacherWorkloadPlanMutation();
  const [deleteWorkloadPlan, deleteWorkloadPlanState] =
    useDeleteAdminTeacherWorkloadPlanMutation();

  const actionLoading =
    createVaqtState.isLoading ||
    deleteVaqtState.isLoading ||
    createDarsState.isLoading ||
    deleteDarsState.isLoading ||
    updateDarsState.isLoading ||
    upsertWorkloadPlanState.isLoading ||
    deleteWorkloadPlanState.isLoading;

  async function handleCreateVaqtOraliq(payload) {
    try {
      await createVaqtOraliq(payload).unwrap();
      toast.success(t("Vaqt oralig`i qo`shildi"));
      return true;
    } catch (error) {
      toast.error(parseScheduleError(error, t("Vaqt oralig`i qo`shilmadi")));
      return false;
    }
  }

  async function handleDeleteVaqtOraliq(id) {
    const ok = await askConfirm({
      title: t("Vaqt oralig'ini o'chirish"),
      message: t("Tanlangan vaqt oralig'i o'chirilsinmi?"),
    });
    if (!ok) return;
    try {
      await deleteVaqtOraliq(id).unwrap();
      toast.success(t("Vaqt oralig`i o`chirildi"));
    } catch (error) {
      toast.error(parseScheduleError(error, t("Vaqt oralig`i o`chirilmadi")));
    }
  }

  async function handleCreateDars(payload) {
    try {
      await createDars(payload).unwrap();
      toast.success(t("Dars jadvalga qo`shildi"));
      return { ok: true };
    } catch (error) {
      const message = parseScheduleError(error, t("Dars qo`shilmadi"));
      const isConflict = isScheduleConflictMessage(message);
      if (isConflict) toast.warning(message);
      else toast.error(message);
      return { ok: false, isConflict, message };
    }
  }

  async function handleDeleteDars(id) {
    const ok = await askConfirm({
      title: t("Darsni o'chirish"),
      message: t("Tanlangan dars jadvaldan o'chirilsinmi?"),
    });
    if (!ok) return;
    try {
      await deleteDars(id).unwrap();
      toast.success(t("Dars jadvaldan o`chirildi"));
    } catch (error) {
      toast.error(parseScheduleError(error, t("Dars o`chirilmadi")));
    }
  }

  async function handleMoveDars(id, payload) {
    try {
      await updateDars({ id, payload }).unwrap();
      toast.success(t("Dars muvaffaqiyatli ko'chirildi"));
      return { ok: true };
    } catch (error) {
      const message = parseScheduleError(error, t("Dars ko`chirilmadi"));
      const isConflict = isScheduleConflictMessage(message);
      if (isConflict) toast.warning(message);
      else toast.error(message);
      return { ok: false, isConflict, message };
    }
  }

  async function handleSaveTeacherWorkloadPlan(payload) {
    try {
      await upsertWorkloadPlan(payload).unwrap();
      toast.success(t("O'qituvchi yuklama limiti saqlandi"));
      return { ok: true };
    } catch (error) {
      const message = parseScheduleError(error, t("Yuklama limiti saqlanmadi"));
      toast.error(message);
      return { ok: false, message };
    }
  }

  async function handleDeleteTeacherWorkloadPlan(id) {
    const ok = await askConfirm({
      title: t("Yuklama limitini o'chirish"),
      message: t("Tanlangan yuklama limiti o'chirilsinmi?"),
    });
    if (!ok) return { ok: false };
    try {
      await deleteWorkloadPlan(id).unwrap();
      toast.success(t("Yuklama limiti o'chirildi"));
      return { ok: true };
    } catch (error) {
      const message = parseScheduleError(error, t("Yuklama limiti o'chirilmadi"));
      toast.error(message);
      return { ok: false, message };
    }
  }

  return {
    confirmModalProps,
    actionLoading,
    vaqtOraliqlari: vaqtQuery.data?.vaqtOraliqlari || [],
    darslar: darslarQuery.data?.darslar || [],
    workloadPlans: workloadPlansQuery.data?.plans || [],
    darslarLoading: darslarQuery.isLoading || darslarQuery.isFetching,
    onCreateVaqtOraliq: handleCreateVaqtOraliq,
    onDeleteVaqtOraliq: handleDeleteVaqtOraliq,
    onCreateDars: handleCreateDars,
    onDeleteDars: handleDeleteDars,
    onMoveDars: handleMoveDars,
    onSaveTeacherWorkloadPlan: handleSaveTeacherWorkloadPlan,
    onDeleteTeacherWorkloadPlan: handleDeleteTeacherWorkloadPlan,
  };
}
