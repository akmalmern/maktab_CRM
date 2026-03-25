import { useTranslation } from 'react-i18next';
import { DarsJadvaliManager } from '../../../../components/admin';
import { ConfirmModal } from '../../../../components/ui';
import PayrollRealLessonsManager from './schedule/PayrollRealLessonsManager';
import useScheduleSectionController from './schedule/useScheduleSectionController';

export default function ScheduleSection({
  viewModel,
}) {
  const { t } = useTranslation();
  const {
    data: { classrooms, subjects, teachers, teachersState },
  } = viewModel;
  const controller = useScheduleSectionController({ t });

  return (
    <div className="space-y-4">
      <DarsJadvaliManager
        actionLoading={controller.actionLoading}
        classrooms={classrooms}
        subjects={subjects}
        teachers={teachers}
        teachersState={teachersState}
        vaqtOraliqlari={controller.vaqtOraliqlari}
        darslar={controller.darslar}
        darslarLoading={controller.darslarLoading}
        workloadPlans={controller.workloadPlans}
        onCreateVaqtOraliq={controller.onCreateVaqtOraliq}
        onDeleteVaqtOraliq={controller.onDeleteVaqtOraliq}
        onCreateDars={controller.onCreateDars}
        onDeleteDars={controller.onDeleteDars}
        onMoveDars={controller.onMoveDars}
        onSaveTeacherWorkloadPlan={controller.onSaveTeacherWorkloadPlan}
        onDeleteTeacherWorkloadPlan={controller.onDeleteTeacherWorkloadPlan}
      />

      <PayrollRealLessonsManager
        teachers={teachers}
        teachersState={teachersState}
        subjects={subjects}
        classrooms={classrooms}
        darslar={controller.darslar}
      />

      <ConfirmModal {...controller.confirmModalProps} loading={controller.actionLoading} />
    </div>
  );
}
