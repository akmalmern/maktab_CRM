import { CreatePersonPanel, PersonTable } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';

export default function TeachersSection({
  actionLoading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  teachers,
  teacherQuery,
  setTeacherQuery,
  onDeleteTeacher,
  onOpenDetail,
}) {
  return (
    <AutoTranslate>
      <>
      <CreatePersonPanel
        loading={actionLoading}
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
        onDelete={onDeleteTeacher}
        onOpenDetail={onOpenDetail}
      />
      </>
    </AutoTranslate>
  );
}
