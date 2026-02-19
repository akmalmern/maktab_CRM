import { ClassroomManager } from '../../../../components/admin';
import { Card } from '../../../../components/ui';

export default function ClassroomsSection({
  classrooms,
  loading,
  actionLoading,
  onCreateClassroom,
  onPreviewPromoteClassroom,
  onPromoteClassroom,
  onPreviewAnnualClassPromotion,
  onRunAnnualClassPromotion,
  onOpenStudentDetail,
  onDeleteStudent,
}) {
  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">Sinflar boshqaruvi</h3>
        <p className="mt-1 text-sm text-slate-500">
          Bu bo'limda yangi sinf qo'shish va mavjud sinflarni boshqarish mumkin.
        </p>
      </Card>
      <ClassroomManager
        classrooms={classrooms}
        loading={loading}
        actionLoading={actionLoading}
        onCreateClassroom={onCreateClassroom}
        onPreviewPromoteClassroom={onPreviewPromoteClassroom}
        onPromoteClassroom={onPromoteClassroom}
        onPreviewAnnualClassPromotion={onPreviewAnnualClassPromotion}
        onRunAnnualClassPromotion={onRunAnnualClassPromotion}
        onOpenStudentDetail={onOpenStudentDetail}
        onDeleteStudent={onDeleteStudent}
      />
    </>
  );
}
