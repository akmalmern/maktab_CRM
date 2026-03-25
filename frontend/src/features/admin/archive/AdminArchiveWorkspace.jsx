import { useNavigate } from 'react-router-dom';
import { useGetClassroomsQuery } from '../../../services/api/classroomsApi';
import { useGetSubjectsQuery } from '../../../services/api/subjectsApi';
import ArchiveSection from '../shared/sections/ArchiveSection';

export default function AdminArchiveWorkspace() {
  const navigate = useNavigate();
  const subjectsQuery = useGetSubjectsQuery();
  const classroomsQuery = useGetClassroomsQuery();

  return (
    <ArchiveSection
      subjects={subjectsQuery.data?.subjects || []}
      classrooms={classroomsQuery.data?.classrooms || []}
      onOpenTeacherDetail={(id) => navigate(`/admin/teachers/${id}`)}
      onOpenStudentDetail={(id) => navigate(`/admin/students/${id}`)}
    />
  );
}
