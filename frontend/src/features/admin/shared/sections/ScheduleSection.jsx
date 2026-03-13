import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { DarsJadvaliManager } from '../../../../components/admin';
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
} from '../../../../services/api/scheduleApi';
import PayrollRealLessonsManager from './schedule/PayrollRealLessonsManager';

export default function ScheduleSection({
  classrooms,
  subjects,
  teachers,
  teachersState,
}) {
  const { t } = useTranslation();
  const vaqtQuery = useGetAdminVaqtOraliqlariQuery();
  const darslarQuery = useGetAdminDarsJadvaliQuery();
  const workloadPlansQuery = useGetAdminTeacherWorkloadPlansQuery();
  const [createVaqtOraliq, createVaqtState] = useCreateAdminVaqtOraliqMutation();
  const [deleteVaqtOraliq, deleteVaqtState] = useDeleteAdminVaqtOraliqMutation();
  const [createDars, createDarsState] = useCreateAdminDarsJadvaliMutation();
  const [deleteDars, deleteDarsState] = useDeleteAdminDarsJadvaliMutation();
  const [updateDars, updateDarsState] = useUpdateAdminDarsJadvaliMutation();
  const [upsertWorkloadPlan, upsertWorkloadPlanState] = useUpsertAdminTeacherWorkloadPlanMutation();
  const [deleteWorkloadPlan, deleteWorkloadPlanState] = useDeleteAdminTeacherWorkloadPlanMutation();
  const vaqtOraliqlari = vaqtQuery.data?.vaqtOraliqlari || [];
  const darslar = darslarQuery.data?.darslar || [];
  const workloadPlans = workloadPlansQuery.data?.plans || [];
  const darslarLoading = darslarQuery.isLoading || darslarQuery.isFetching;
  const actionLoading =
    createVaqtState.isLoading ||
    deleteVaqtState.isLoading ||
    createDarsState.isLoading ||
    deleteDarsState.isLoading ||
    updateDarsState.isLoading ||
    upsertWorkloadPlanState.isLoading ||
    deleteWorkloadPlanState.isLoading;

  function parseScheduleError(error, fallback) {
    return error?.message || error?.data?.message || fallback;
  }

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
    const ok = window.confirm(t("Vaqt oralig'ini o'chirish"));
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
      const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud|yuklama|limit/i.test(message);
      if (isConflict) toast.warning(message);
      else toast.error(message);
      return { ok: false, isConflict, message };
    }
  }

  async function handleDeleteDars(id) {
    const ok = window.confirm(t("Darsni o'chirish"));
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
      const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud|yuklama|limit/i.test(message);
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
    const ok = window.confirm(t("Yuklama limitini o'chirish"));
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

  return (
    <div className="space-y-4">
      <DarsJadvaliManager
        actionLoading={actionLoading}
        classrooms={classrooms}
        subjects={subjects}
        teachers={teachers}
        teachersState={teachersState}
        vaqtOraliqlari={vaqtOraliqlari}
        darslar={darslar}
        darslarLoading={darslarLoading}
        workloadPlans={workloadPlans}
        onCreateVaqtOraliq={handleCreateVaqtOraliq}
        onDeleteVaqtOraliq={handleDeleteVaqtOraliq}
        onCreateDars={handleCreateDars}
        onDeleteDars={handleDeleteDars}
        onMoveDars={handleMoveDars}
        onSaveTeacherWorkloadPlan={handleSaveTeacherWorkloadPlan}
        onDeleteTeacherWorkloadPlan={handleDeleteTeacherWorkloadPlan}
      />

      <PayrollRealLessonsManager
        teachers={teachers}
        teachersState={teachersState}
        subjects={subjects}
        classrooms={classrooms}
        darslar={darslar}
      />
    </div>
  );
}
