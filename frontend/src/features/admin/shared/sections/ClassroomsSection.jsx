import { ClassroomManager } from '../../../../components/admin';
import AutoTranslate from '../../../../components/AutoTranslate';
import { Card } from '../../../../components/ui';
import { useTranslation } from 'react-i18next';

export default function ClassroomsSection({
  onOpenStudentDetail,
  onDeleteStudent,
}) {
  const { t } = useTranslation();

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{t('Sinflar boshqaruvi')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("Bu bo'limda yangi sinf qo'shish va mavjud sinflarni boshqarish mumkin.")}
          </p>
        </Card>
        <ClassroomManager
          onOpenStudentDetail={onOpenStudentDetail}
          onDeleteStudent={onDeleteStudent}
        />
      </div>
    </AutoTranslate>
  );
}
