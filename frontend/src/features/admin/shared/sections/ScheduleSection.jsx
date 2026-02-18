import { DarsJadvaliManager } from '../../../../components/admin';

export default function ScheduleSection({
  actionLoading,
  classrooms,
  subjects,
  teachers,
  vaqtOraliqlari,
  darslar,
  darslarLoading,
  onCreateVaqtOraliq,
  onDeleteVaqtOraliq,
  onCreateDars,
  onDeleteDars,
  onMoveDars,
}) {
  return (
    <DarsJadvaliManager
      actionLoading={actionLoading}
      classrooms={classrooms}
      subjects={subjects}
      teachers={teachers}
      vaqtOraliqlari={vaqtOraliqlari}
      darslar={darslar}
      darslarLoading={darslarLoading}
      onCreateVaqtOraliq={onCreateVaqtOraliq}
      onDeleteVaqtOraliq={onDeleteVaqtOraliq}
      onCreateDars={onCreateDars}
      onDeleteDars={onDeleteDars}
      onMoveDars={onMoveDars}
    />
  );
}
