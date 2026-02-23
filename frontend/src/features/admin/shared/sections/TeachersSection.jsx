import { CreatePersonPanel, PersonTable } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';
import { useDeleteTeacherMutation, useGetTeachersQuery } from '../../../../services/api/peopleApi';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

export default function TeachersSection({
  actionLoading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  teacherQuery,
  setTeacherQuery,
  onOpenDetail,
}) {
  const { t } = useTranslation();
  const teachersQueryResult = useGetTeachersQuery(teacherQuery);
  const [deleteTeacher, deleteTeacherState] = useDeleteTeacherMutation();
  const teachersData = teachersQueryResult.data || {};
  const teachers = {
    items: teachersData.teachers || [],
    page: teachersData.page || teacherQuery.page || 1,
    pages: teachersData.pages || 1,
    loading: teachersQueryResult.isLoading || teachersQueryResult.isFetching,
    error: teachersQueryResult.error?.message || null,
  };

  async function handleDeleteTeacher(id) {
    const ok = window.confirm(t("Teacherni o'chirish"));
    if (!ok) return;
    try {
      await deleteTeacher(id).unwrap();
      toast.success(t('Teacher o`chirildi'));
    } catch (error) {
      toast.error(error?.message || t('Teacher o`chirilmadi'));
    }
  }

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <CreatePersonPanel
          loading={actionLoading || deleteTeacherState.isLoading}
          subjects={subjects}
          classrooms={classrooms}
          onCreateTeacher={onCreateTeacher}
          onCreateStudent={onCreateStudent}
          mode="teacher"
        />

        <PersonTable
          title="Teacherlar ro'yxati"
          rows={teachers.items}
          showSubject
          showClassroom={false}
          loading={teachers.loading}
          error={teachers.error}
          page={teachers.page}
          pages={teachers.pages}
          onPageChange={(page) => setTeacherQuery((prev) => ({ ...prev, page }))}
          searchValue={teacherQuery.search}
          onSearchChange={(search) => setTeacherQuery((prev) => ({ ...prev, search, page: 1 }))}
          filterValue={teacherQuery.filter}
          onFilterChange={(filter) => setTeacherQuery((prev) => ({ ...prev, filter, page: 1 }))}
          filterOptions={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
          sortValue={teacherQuery.sort}
          onSortChange={(sort) => setTeacherQuery((prev) => ({ ...prev, sort, page: 1 }))}
          pageSize={teacherQuery.limit}
          onPageSizeChange={(limit) => setTeacherQuery((prev) => ({ ...prev, limit, page: 1 }))}
          onDelete={handleDeleteTeacher}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </AutoTranslate>
  );
}
