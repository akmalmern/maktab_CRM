import { useTranslation } from 'react-i18next';
import { Card, StateView } from '../../../components/ui';
import StudentAttendanceFilters from './StudentAttendanceFilters';
import StudentAttendanceHistoryTable from './StudentAttendanceHistoryTable';
import StudentAttendanceOverview from './StudentAttendanceOverview';
import useStudentAttendanceController from './useStudentAttendanceController';

export default function StudentAttendanceWorkspace() {
  const { t } = useTranslation();
  const vm = useStudentAttendanceController();

  return (
    <div className="space-y-4">
      <Card
        title={t('Mening davomatim')}
        subtitle={t("Davomat tarixini period va holat bo'yicha ko'ring.")}
      >
        <StudentAttendanceFilters
          sana={vm.sana}
          periodType={vm.periodType}
          holat={vm.holat}
          limit={vm.limit}
          page={vm.page}
          pages={vm.pages}
          period={vm.data?.period || null}
          onSanaChange={vm.handleSanaChange}
          onPeriodTypeChange={vm.handlePeriodTypeChange}
          onHolatChange={vm.handleHolatChange}
          onLimitChange={vm.handleLimitChange}
          onReset={vm.resetFilters}
          onRefresh={vm.refresh}
        />
      </Card>

      {vm.loading ? <StateView type="loading" /> : null}
      {!vm.loading && vm.error ? <StateView type="error" description={vm.error} /> : null}

      {!vm.loading && !vm.error && vm.data ? (
        <>
          <StudentAttendanceOverview data={vm.data} />
          <StudentAttendanceHistoryTable
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
