import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { DarsJadvaliManager } from '../../../../components/admin';
import {
  useCreateAdminDarsJadvaliMutation,
  useCreateAdminVaqtOraliqMutation,
  useDeleteAdminDarsJadvaliMutation,
  useDeleteAdminVaqtOraliqMutation,
  useGetAdminDarsJadvaliQuery,
  useGetAdminVaqtOraliqlariQuery,
  useUpdateAdminDarsJadvaliMutation,
} from '../../../../services/api/scheduleApi';

export default function ScheduleSection({
  classrooms,
  subjects,
  teachers,
}) {
  const { t } = useTranslation();
  const vaqtQuery = useGetAdminVaqtOraliqlariQuery();
  const darslarQuery = useGetAdminDarsJadvaliQuery();
  const [createVaqtOraliq, createVaqtState] = useCreateAdminVaqtOraliqMutation();
  const [deleteVaqtOraliq, deleteVaqtState] = useDeleteAdminVaqtOraliqMutation();
  const [createDars, createDarsState] = useCreateAdminDarsJadvaliMutation();
  const [deleteDars, deleteDarsState] = useDeleteAdminDarsJadvaliMutation();
  const [updateDars, updateDarsState] = useUpdateAdminDarsJadvaliMutation();
  const vaqtOraliqlari = vaqtQuery.data?.vaqtOraliqlari || [];
  const darslar = darslarQuery.data?.darslar || [];
  const darslarLoading = darslarQuery.isLoading || darslarQuery.isFetching;
  const actionLoading =
    createVaqtState.isLoading ||
    deleteVaqtState.isLoading ||
    createDarsState.isLoading ||
    deleteDarsState.isLoading ||
    updateDarsState.isLoading;

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
      const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
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
      const isConflict = /conflict|to'qnash|to`qnash|shu vaqtda|band|mavjud/i.test(message);
      if (isConflict) toast.warning(message);
      else toast.error(message);
      return { ok: false, isConflict, message };
    }
  }

  return (
    <div className="space-y-4">
      <DarsJadvaliManager
        actionLoading={actionLoading}
        classrooms={classrooms}
        subjects={subjects}
        teachers={teachers}
        vaqtOraliqlari={vaqtOraliqlari}
        darslar={darslar}
        darslarLoading={darslarLoading}
        onCreateVaqtOraliq={handleCreateVaqtOraliq}
        onDeleteVaqtOraliq={handleDeleteVaqtOraliq}
        onCreateDars={handleCreateDars}
        onDeleteDars={handleDeleteDars}
        onMoveDars={handleMoveDars}
      />
    </div>
  );
}
