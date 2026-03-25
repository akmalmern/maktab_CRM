import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useClassroomsAnnualPromotionFlow from './useClassroomsAnnualPromotionFlow';
import useClassroomsData from './useClassroomsData';
import useClassroomStudentsFlow from './useClassroomStudentsFlow';

export default function useAdminClassroomsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dataState = useClassroomsData({ t });
  const studentsFlow = useClassroomStudentsFlow({
    classrooms: dataState.classrooms,
    t,
  });
  const annualFlow = useClassroomsAnnualPromotionFlow({ t });
  const [confirmState, setConfirmState] = useState({
    open: false,
    mode: null,
    student: null,
  });

  function requestRemoveStudent(student) {
    setConfirmState({
      open: true,
      mode: 'remove-student',
      student,
    });
  }

  function requestRunAnnualPromotion() {
    setConfirmState({
      open: true,
      mode: 'run-annual-promotion',
      student: null,
    });
  }

  function closeConfirm() {
    setConfirmState({
      open: false,
      mode: null,
      student: null,
    });
  }

  async function handleConfirm() {
    if (confirmState.mode === 'remove-student' && confirmState.student) {
      await studentsFlow.removeSelectedStudent(confirmState.student);
      closeConfirm();
      return;
    }

    if (confirmState.mode === 'run-annual-promotion') {
      await annualFlow.executeAnnualPromotion();
      closeConfirm();
    }
  }

  const confirmConfig =
    confirmState.mode === 'remove-student'
      ? {
          title: t('Sinfdan chiqarish'),
          message: t("Bu studentni sinfdan chiqarilsinmi?"),
        }
      : {
          title: t("Yillik sinf yangilash"),
          message: t("Yillik sinf yangilash bajarilsinmi?"),
        };

  return {
    t,
    navigate,
    classrooms: dataState.classrooms,
    meta: dataState.meta,
    name: dataState.name,
    academicYear: dataState.academicYear,
    academicYearOptions: dataState.academicYearOptions,
    selectedClassroom: studentsFlow.selectedClassroom,
    studentSearchInput: studentsFlow.studentSearchInput,
    annualModalOpen: annualFlow.annualModalOpen,
    confirmState,
    confirmConfig,
    classroomsState: dataState.classroomsState,
    studentsState: studentsFlow.studentsState,
    annualPreviewState: annualFlow.annualPreviewState,
    createLoading: dataState.createLoading,
    removeLoading: studentsFlow.removeLoading,
    annualActionLoading: annualFlow.annualActionLoading,
    onNameChange: dataState.onNameChange,
    onNameBlur: dataState.onNameBlur,
    onAcademicYearChange: dataState.onAcademicYearChange,
    onSelectNextAcademicYear: dataState.onSelectNextAcademicYear,
    onCreateClassroom: dataState.onCreateClassroom,
    onOpenStudentModal: studentsFlow.onOpenStudentModal,
    onCloseStudentModal: studentsFlow.onCloseStudentModal,
    onStudentSearchChange: studentsFlow.onStudentSearchChange,
    onStudentSearchSubmit: studentsFlow.onStudentSearchSubmit,
    onStudentPageChange: studentsFlow.onStudentPageChange,
    onOpenStudentDetail: (studentId) => navigate(`/admin/students/${studentId}`),
    onOpenAnnualModal: annualFlow.onOpenAnnualModal,
    onCloseAnnualModal: annualFlow.onCloseAnnualModal,
    onRefreshAnnualPreview: annualFlow.onRefreshAnnualPreview,
    onRequestRemoveStudent: requestRemoveStudent,
    onRequestRunAnnualPromotion: requestRunAnnualPromotion,
    onConfirm: handleConfirm,
    onCancelConfirm: closeConfirm,
  };
}
