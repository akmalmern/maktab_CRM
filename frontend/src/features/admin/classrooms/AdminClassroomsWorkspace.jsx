import AutoTranslate from '../../../components/AutoTranslate';
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  StateView,
} from '../../../components/ui';
import AnnualPromotionModal from './components/AnnualPromotionModal';
import { buildAdminClassroomsWorkspaceModel } from './adminClassroomsWorkspaceModel';
import ClassroomCreateForm from './components/ClassroomCreateForm';
import ClassroomGrid from './components/ClassroomGrid';
import ClassroomStudentsModal from './components/ClassroomStudentsModal';
import useAdminClassroomsPage from './useAdminClassroomsPage';

export default function AdminClassroomsWorkspace() {
  const pageState = useAdminClassroomsPage();
  const vm = buildAdminClassroomsWorkspaceModel(pageState);

  return (
    <AutoTranslate>
      <div className="space-y-4">
        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            {vm.t('Sinflar boshqaruvi')}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {vm.t("Bu bo'limda yangi sinf qo'shish va mavjud sinflarni boshqarish mumkin.")}
          </p>
        </Card>

        <Card
          title={vm.t('Sinflar boshqaruvi')}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="info">{vm.t('Jami')}: {vm.classrooms.length}</Badge>
              <Button
                size="sm"
                variant="indigo"
                onClick={vm.onOpenAnnualModal}
                disabled={vm.annualModal.previewState.loading || vm.annualModal.actionLoading}
              >
                {vm.t("Yillik avtomat o'tkazish")}
              </Button>
            </div>
          }
        >
          <ClassroomCreateForm
            t={vm.t}
            name={vm.createForm.name}
            academicYear={vm.createForm.academicYear}
            academicYearOptions={vm.createForm.academicYearOptions}
            meta={vm.meta}
            loading={vm.createForm.loading}
            onNameChange={vm.createForm.onNameChange}
            onNameBlur={vm.createForm.onNameBlur}
            onAcademicYearChange={vm.createForm.onAcademicYearChange}
            onSelectNextAcademicYear={vm.createForm.onSelectNextAcademicYear}
            onSubmit={vm.createForm.onSubmit}
          />

          {vm.classroomsState.loading ? (
            <StateView type="loading" />
          ) : vm.classroomsState.error ? (
            <StateView type="error" description={vm.classroomsState.error || vm.t('Sinflar olinmadi')} />
          ) : vm.classrooms.length ? (
            <ClassroomGrid
              t={vm.t}
              classrooms={vm.classrooms}
              onOpenClassroom={vm.onOpenClassroom}
            />
          ) : (
            <StateView type="empty" description={vm.t('Sinflar mavjud emas')} />
          )}
        </Card>

        <ClassroomStudentsModal t={vm.t} {...vm.studentsModal} />

        <AnnualPromotionModal t={vm.t} {...vm.annualModal} />

        <ConfirmModal {...vm.confirmModal} />
      </div>
    </AutoTranslate>
  );
}
