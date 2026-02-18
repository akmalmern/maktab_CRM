import { SubjectManager } from '../../../../components/admin';

export default function SubjectsSection({
  subjects,
  loading,
  actionLoading,
  onCreateSubject,
  onDeleteSubject,
}) {
  return (
    <SubjectManager
      subjects={subjects}
      loading={loading}
      actionLoading={actionLoading}
      onCreateSubject={onCreateSubject}
      onDeleteSubject={onDeleteSubject}
    />
  );
}
