import { useTranslation } from 'react-i18next';
import { Card, StateView } from '../../../components/ui';
import TeacherGradesFilters from './TeacherGradesFilters';
import TeacherGradesStats from './TeacherGradesStats';
import TeacherGradesTable from './TeacherGradesTable';
import useTeacherGradesController from './useTeacherGradesController';

export default function TeacherGradesWorkspace() {
  const { t } = useTranslation();
  const vm = useTeacherGradesController();

  return (
    <div className="space-y-4">
      <Card title={t('Baholar')} subtitle={t("Baholarni sana, sinf va tur bo'yicha filtrlang.")}>
        <TeacherGradesFilters
          sana={vm.sana}
          bahoTuri={vm.bahoTuri}
          classroomId={vm.classroomId}
          limit={vm.limit}
          page={vm.page}
          pages={vm.pages}
          total={vm.total}
          classrooms={vm.classrooms}
          onSanaChange={vm.handleSanaChange}
          onClassroomChange={vm.handleClassroomChange}
          onBahoTuriChange={vm.handleBahoTuriChange}
          onLimitChange={vm.handleLimitChange}
          onReset={vm.resetFilters}
          onRefresh={vm.refresh}
        />
      </Card>

      {vm.loading ? <StateView type="loading" /> : null}
      {!vm.loading && vm.error ? <StateView type="error" description={vm.error} /> : null}

      {!vm.loading && !vm.error && vm.data ? (
        <>
          <TeacherGradesStats data={vm.data} />
          <TeacherGradesTable
            data={vm.data}
            page={vm.page}
            pages={vm.pages}
            onPageChange={vm.setPage}
          />
        </>
      ) : null}
    </div>
  );
}
