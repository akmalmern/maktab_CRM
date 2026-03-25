import { CreatePersonPanel, PersonTable } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';
import { ConfirmModal } from '../../../../components/ui';
import useAsyncConfirm from '../../../../hooks/useAsyncConfirm';
import { useDeleteStudentMutation, useGetStudentsQuery } from '../../../../services/api/peopleApi';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

export default function StudentsSection({
  actionLoading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  studentQuery,
  setStudentQuery,
  onOpenDetail,
}) {
  const { t } = useTranslation();
  const studentsQueryResult = useGetStudentsQuery(studentQuery);
  const [deleteStudent, deleteStudentState] = useDeleteStudentMutation();
  const { askConfirm, confirmModalProps } = useAsyncConfirm();
  const studentsData = studentsQueryResult.data || {};
  const students = {
    items: studentsData.students || [],
    page: studentsData.page || studentQuery.page || 1,
    pages: studentsData.pages || 1,
    loading: studentsQueryResult.isLoading || studentsQueryResult.isFetching,
    error: studentsQueryResult.error?.message || null,
  };

  async function handleDeleteStudent(id) {
    const ok = await askConfirm({
      title: t("Studentni o'chirish"),
      message: t("Studentni o'chirmoqchimisiz?"),
    });
    if (!ok) return;
    try {
      await deleteStudent(id).unwrap();
      toast.success(t('Student o`chirildi'));
    } catch (error) {
      toast.error(error?.message || t('Student o`chirilmadi'));
    }
  }

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <CreatePersonPanel
          loading={actionLoading || deleteStudentState.isLoading}
          subjects={subjects}
          classrooms={classrooms}
          onCreateTeacher={onCreateTeacher}
          onCreateStudent={onCreateStudent}
          mode="student"
        />

        <PersonTable
          title="Studentlar ro'yxati"
          rows={students.items}
          showSubject={false}
          showClassroom
          loading={students.loading}
          error={students.error}
          page={students.page}
          pages={students.pages}
          onPageChange={(page) => setStudentQuery((prev) => ({ ...prev, page }))}
          searchValue={studentQuery.search}
          onSearchChange={(search) => setStudentQuery((prev) => ({ ...prev, search, page: 1 }))}
          filterValue={studentQuery.filter}
          onFilterChange={(filter) => setStudentQuery((prev) => ({ ...prev, filter, page: 1 }))}
          filterOptions={classrooms.map((classroom) => ({
            value: classroom.id,
            label: `${classroom.name} (${classroom.academicYear})`,
          }))}
          sortValue={studentQuery.sort}
          onSortChange={(sort) => setStudentQuery((prev) => ({ ...prev, sort, page: 1 }))}
          pageSize={studentQuery.limit}
          onPageSizeChange={(limit) => setStudentQuery((prev) => ({ ...prev, limit, page: 1 }))}
          onDelete={handleDeleteStudent}
          onOpenDetail={onOpenDetail}
        />

        <ConfirmModal {...confirmModalProps} loading={deleteStudentState.isLoading} />
      </div>
    </AutoTranslate>
  );
}
