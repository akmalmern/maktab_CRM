import { CreatePersonPanel, PersonTable } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';

export default function StudentsSection({
  actionLoading,
  subjects,
  classrooms,
  onCreateTeacher,
  onCreateStudent,
  students,
  studentQuery,
  setStudentQuery,
  onDeleteStudent,
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
        onDelete={onDeleteStudent}
        onOpenDetail={onOpenDetail}
      />
      </>
    </AutoTranslate>
  );
}
