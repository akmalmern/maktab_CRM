import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../../components/ui';
import TeacherAttendanceHistory from './TeacherAttendanceHistory';
import TeacherAttendanceJournal from './TeacherAttendanceJournal';
import useTeacherAttendanceController from './useTeacherAttendanceController';

export default function TeacherAttendanceWorkspace() {
  const { t } = useTranslation();
  const vm = useTeacherAttendanceController();

  return (
    <div className="space-y-4">
      <Card title={t("Davomat bo'limi")}>
        <div className="flex flex-wrap gap-2">
          {vm.activeView === 'journal' ? (
            <Button variant="secondary" onClick={() => vm.setActiveView('history')}>
              {t("O'tilgan darslar davomat tarixi")}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => vm.setActiveView('journal')}>
              {t('Ortga qaytish')}
            </Button>
          )}
        </div>
      </Card>

      {vm.activeView === 'journal' ? (
        <TeacherAttendanceJournal
          sana={vm.sana}
          onSanaChange={vm.handleSanaChange}
          oquvYili={vm.oquvYili}
          oquvYillar={vm.oquvYillar}
          onOquvYiliChange={vm.handleOquvYiliChange}
          darslar={vm.darslar}
          selectedDarsId={vm.selectedDarsId}
          onSelectedDarsIdChange={vm.handleSelectedDarsIdChange}
          detail={vm.detail}
          loading={vm.journalLoading}
          error={vm.journalError}
          saving={vm.saving}
          onRefresh={vm.refreshJournal}
          onSave={vm.handleSave}
          onUpdateStudent={vm.updateStudent}
          onApplyBulkHolat={vm.applyBulkHolat}
        />
      ) : (
        <TeacherAttendanceHistory
          sana={vm.sana}
          onSanaChange={vm.handleSanaChange}
          tarixPeriodType={vm.tarixPeriodType}
          onTarixPeriodTypeChange={vm.setTarixPeriodType}
          tarixHolat={vm.tarixHolat}
          onTarixHolatChange={vm.setTarixHolat}
          tarixLimit={vm.tarixLimit}
          onTarixLimitChange={vm.setTarixLimit}
          tarixPage={vm.tarixPage}
          tarixPages={vm.tarixPages}
          tarixRange={vm.tarixRange}
          tarixTotal={vm.tarixTotal}
          tarix={vm.tarix}
          loading={vm.historyLoading}
          error={vm.historyError}
          onRefresh={vm.refreshHistory}
          onTarixPageChange={vm.setTarixPage}
        />
      )}
    </div>
  );
}
