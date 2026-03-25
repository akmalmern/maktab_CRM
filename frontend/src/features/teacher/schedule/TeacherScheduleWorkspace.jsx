import { useTranslation } from 'react-i18next';
import { StateView } from '../../../components/ui';
import TeacherScheduleGrid from './TeacherScheduleGrid';
import TeacherScheduleHeader from './TeacherScheduleHeader';
import useTeacherScheduleController from './useTeacherScheduleController';

export default function TeacherScheduleWorkspace() {
  const { i18n } = useTranslation();
  const vm = useTeacherScheduleController();

  return (
    <div className="space-y-4">
      <TeacherScheduleHeader
        t={vm.t}
        oquvYili={vm.oquvYili}
        oquvYillar={vm.oquvYillar}
        monthKey={vm.monthKey}
        loadSummary={vm.loadSummary}
        onOquvYiliChange={vm.setOquvYili}
        onMonthKeyChange={vm.setMonthKey}
        onRefresh={vm.refresh}
      />

      {vm.loading ? <StateView type="loading" /> : null}
      {!vm.loading && vm.error ? <StateView type="error" description={vm.error} /> : null}

      {!vm.loading && !vm.error ? (
        <TeacherScheduleGrid
          t={vm.t}
          i18nLanguage={i18n.language}
          vaqtlar={vm.vaqtlar}
          gridMap={vm.gridMap}
          onGoAttendance={vm.handleGoAttendance}
        />
      ) : null}
    </div>
  );
}
