import { useTranslation } from 'react-i18next';
import { Card, StateView } from '../../../components/ui';
import StudentGradesFilters from './StudentGradesFilters';
import StudentGradesStats from './StudentGradesStats';
import StudentGradesTable from './StudentGradesTable';
import useStudentGradesController from './useStudentGradesController';

export default function StudentGradesWorkspace() {
  const { t } = useTranslation();
  const vm = useStudentGradesController();

  return (
    <div className="space-y-4">
      <Card
        title={t('Mening baholarim')}
        subtitle={t("Baholarni filtrlang va o'zingiz/sinf kesimida ko'ring.")}
      >
        <StudentGradesFilters
          sana={vm.sana}
          bahoTuri={vm.bahoTuri}
          activeView={vm.activeView}
          limit={vm.limit}
          page={vm.page}
          pages={vm.pages}
          total={vm.total}
          classroom={vm.data?.classroom || ''}
          isAnonymized={Boolean(vm.data?.isAnonymized)}
          onSanaChange={vm.handleSanaChange}
          onBahoTuriChange={vm.handleBahoTuriChange}
          onLimitChange={vm.handleLimitChange}
          onReset={vm.resetFilters}
          onRefresh={vm.refresh}
          onActiveViewChange={vm.handleActiveViewChange}
        />
      </Card>

      {vm.loading ? <StateView type="loading" /> : null}
      {!vm.loading && vm.error ? <StateView type="error" description={vm.error} /> : null}

      {!vm.loading && !vm.error && vm.data ? (
        <>
          <StudentGradesStats data={vm.data} />
          <StudentGradesTable
            activeView={vm.activeView}
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
