import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  useGetClassroomStudentsQuery,
  useRemoveStudentFromClassroomMutation,
} from '../../../services/api/classroomsApi';
import { collapseDraftName } from './models/classroomViewModel';

export default function useClassroomStudentsFlow({ classrooms, t }) {
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const [removeStudentFromClassroom, removeStudentFromClassroomState] =
    useRemoveStudentFromClassroomMutation();

  const selectedClassroom = useMemo(
    () => classrooms.find((item) => item.id === selectedClassroomId) || null,
    [classrooms, selectedClassroomId],
  );

  const studentsQuery = useGetClassroomStudentsQuery(
    {
      classroomId: selectedClassroomId,
      page: studentPage,
      limit: 20,
      search: studentSearch || undefined,
    },
    {
      skip: !selectedClassroomId,
    },
  );

  async function removeSelectedStudent(student) {
    if (!selectedClassroom || !student?.id) return false;
    try {
      await removeStudentFromClassroom({
        classroomId: selectedClassroom.id,
        studentId: student.id,
      }).unwrap();
      toast.success(t('Student sinfdan chiqarildi'));
      await studentsQuery.refetch();
      return true;
    } catch (error) {
      toast.error(error?.message || t("Studentni sinfdan chiqarib bo'lmadi"));
      return false;
    }
  }

  function submitStudentSearch(event) {
    event.preventDefault();
    setStudentPage(1);
    setStudentSearch(collapseDraftName(studentSearchInput));
  }

  function openStudentModal(classroomId) {
    setSelectedClassroomId(classroomId);
    setStudentSearchInput('');
    setStudentSearch('');
    setStudentPage(1);
  }

  function closeStudentModal() {
    setSelectedClassroomId('');
    setStudentSearchInput('');
    setStudentSearch('');
    setStudentPage(1);
  }

  function handleStudentPageChange(nextPage) {
    const pageNumber = Number(nextPage);
    if (!Number.isFinite(pageNumber) || pageNumber < 1) {
      setStudentPage(1);
      return;
    }
    const maxPage = studentsQuery.data?.pages || pageNumber;
    setStudentPage(Math.min(pageNumber, Math.max(1, maxPage)));
  }

  const studentsState = {
    rows: studentsQuery.data?.students || [],
    page: studentsQuery.data?.page || studentPage,
    pages: studentsQuery.data?.pages || 1,
    total: studentsQuery.data?.total || 0,
    loading:
      Boolean(selectedClassroomId) &&
      (studentsQuery.isLoading || studentsQuery.isFetching),
    error: studentsQuery.error?.message || null,
  };

  return {
    selectedClassroom,
    selectedClassroomId,
    studentSearchInput,
    studentsState,
    removeLoading: removeStudentFromClassroomState.isLoading,
    onOpenStudentModal: openStudentModal,
    onCloseStudentModal: closeStudentModal,
    onStudentSearchChange: setStudentSearchInput,
    onStudentSearchSubmit: submitStudentSearch,
    onStudentPageChange: handleStudentPageChange,
    removeSelectedStudent,
  };
}
