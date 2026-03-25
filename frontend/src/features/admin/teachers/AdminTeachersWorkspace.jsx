import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import TeachersSection from '../shared/sections/TeachersSection';
import useAdminPersonCreation from '../shared/useAdminPersonCreation';

const DEFAULT_LIST_QUERY = {
  search: '',
  page: 1,
  limit: 10,
  filter: 'all',
  sort: 'name:asc',
};

export default function AdminTeachersWorkspace() {
  const navigate = useNavigate();
  const [teacherQuery, setTeacherQuery] = useState(DEFAULT_LIST_QUERY);
  const subjectsQuery = useGetSubjectsQuery();
  const classroomsQuery = useGetClassroomsQuery();
  const { actionLoading, handleCreateTeacher, handleCreateStudent } = useAdminPersonCreation();

  return (
    <TeachersSection
      actionLoading={actionLoading}
      subjects={subjectsQuery.data?.subjects || []}
      classrooms={classroomsQuery.data?.classrooms || []}
      onCreateTeacher={handleCreateTeacher}
      onCreateStudent={handleCreateStudent}
      teacherQuery={teacherQuery}
      setTeacherQuery={setTeacherQuery}
      onOpenDetail={(id) => navigate(`/admin/teachers/${id}`)}
    />
  );
}
