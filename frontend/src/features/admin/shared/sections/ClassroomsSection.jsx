import { ClassroomManager } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Card } from '../../../../components/ui';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <AutoTranslate>
      <>
      <Card>
        <h3 className="text-lg font-semibold text-slate-900">{t('Sinflar boshqaruvi')}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("Bu bo'limda yangi sinf qo'shish va mavjud sinflarni boshqarish mumkin.")}
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
    </AutoTranslate>
  );
}
