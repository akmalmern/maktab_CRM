import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import StudentsSection from '../shared/sections/StudentsSection';
import useAdminPersonCreation from '../shared/useAdminPersonCreation';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};

export default function AdminStudentsWorkspace() {
  const navigate = useNavigate();
  const [studentQuery, setStudentQuery] = useState(DEFAULT_LIST_QUERY);
  const subjectsQuery = useGetSubjectsQuery();
  const classroomsQuery = useGetClassroomsQuery();
  const { actionLoading, handleCreateTeacher, handleCreateStudent } = useAdminPersonCreation();

  return (
    <StudentsSection
      actionLoading={actionLoading}
      subjects={subjectsQuery.data?.subjects || []}
      classrooms={classroomsQuery.data?.classrooms || []}
      onCreateTeacher={handleCreateTeacher}
      onCreateStudent={handleCreateStudent}
      studentQuery={studentQuery}
      setStudentQuery={setStudentQuery}
      onOpenDetail={(id) => navigate(`/admin/students/${id}`)}
    />
  );
}
