import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  useCreateStudentMutation,
  useCreateTeacherMutation,
} from '../../../services/api/peopleApi';

export default function useAdminPersonCreation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createTeacherMutation, createTeacherMutationState] = useCreateTeacherMutation();
  const [createStudentMutation, createStudentMutationState] = useCreateStudentMutation();

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

  return {
    actionLoading: createTeacherMutationState.isLoading || createStudentMutationState.isLoading,
    handleCreateTeacher,
    handleCreateStudent,
  };
}
