import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Input,
  Select,
  StateView,
} from '../../../../../components/ui';
import PayrollRunActionsCard from './PayrollRunActionsCard';
import PayrollRunItemsTableCard from './PayrollRunItemsTableCard';
import PayrollRunSummaryGrid from './PayrollRunSummaryGrid';
import { getRunStatusLabel } from './payrollRunLabels';

export function PayrollRunsPanel({
  tab,
  periodMonth,
  setPeriodMonth,
  setRunFilters,
  runs,
  activeRunId,
  setSelectedRunId,
  selectedRun,
  runsState,
  runDetailLoading,
  runDetailError,
  isAdminView,
  isManagerView,
  busy,
  handleRefreshRunsDashboard,
  handleGenerateRun,
  formatMoney,
  selectedRunPayableAmount,
  selectedRunPaidAmount,
  selectedRunRemainingAmount,
  runItemsColumns,
  runItemsRows,
  runItemsState,
  lineFilters,
  setLineFilters,
  selectedRunTeacherCount,
  payForm,
  setPayForm,
  canPaySelectedRun,
  runPrimaryAction,
  canReverseSelectedRun,
  reverseReason,
  setReverseReason,
  handleReverseRun,
}) {
  const { t } = useTranslation();

  if (tab !== 'runs') return null;

  return (
    <>
      <Card
        title={t('Joriy Oylik')}
        subtitle={t("Faqat asosiy oqim: yaratish, ko'rish, tasdiqlash va to'lash")}
        actions={(
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input
              type="month"
              value={periodMonth}
              onChange={(e) => {
                const nextMonth = e.target.value;
                setPeriodMonth(nextMonth);
                setRunFilters((prev) => ({ ...prev, periodMonth: nextMonth, page: 1 }));
              }}
            />
            {runs.length > 1 ? (
              <Select value={activeRunId} onChange={(e) => setSelectedRunId(e.target.value)}>
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.periodMonth} | {getRunStatusLabel(run.status, t)}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex items-center rounded-xl border border-slate-200 px-3 text-sm text-slate-600">
                {selectedRun ? getRunStatusLabel(selectedRun.status, t) : t("Hisob-kitob yo'q")}
              </div>
            )}
            <Button variant="secondary" onClick={handleRefreshRunsDashboard} disabled={runsState.loading || busy}>
              {t('Yangilash')}
            </Button>
            {isAdminView && (
              <Button variant="indigo" onClick={handleGenerateRun} disabled={busy || !periodMonth}>
                {selectedRun ? t('Qayta yaratish') : t('Yaratish')}
              </Button>
            )}
          </div>
        )}
      >
        {runsState.loading || runDetailLoading ? <StateView type="skeleton" /> : null}
        {runsState.error ? <StateView type="error" description={runsState.error} /> : null}
        {runDetailError ? <StateView type="error" description={runDetailError} /> : null}

        {!runsState.loading && !runsState.error && !selectedRun && (
          <StateView
            type="empty"
            description={t("Tanlangan oy uchun hisob-kitob topilmadi. Avval Yaratish tugmasini bosing.")}
          />
        )}

        {selectedRun && !runDetailLoading && !runDetailError && (
          <div className="space-y-4">
            <PayrollRunSummaryGrid
              selectedRun={selectedRun}
              formatMoney={formatMoney}
              selectedRunPayableAmount={selectedRunPayableAmount}
              selectedRunPaidAmount={selectedRunPaidAmount}
              selectedRunRemainingAmount={selectedRunRemainingAmount}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <PayrollRunItemsTableCard
                runItemsColumns={runItemsColumns}
                runItemsRows={runItemsRows}
                runItemsState={runItemsState}
                lineFilters={lineFilters}
                setLineFilters={setLineFilters}
              />

              <PayrollRunActionsCard
                selectedRun={selectedRun}
                selectedRunTeacherCount={selectedRunTeacherCount}
                isAdminView={isAdminView}
                isManagerView={isManagerView}
                busy={busy}
                payForm={payForm}
                setPayForm={setPayForm}
                canPaySelectedRun={canPaySelectedRun}
                runPrimaryAction={runPrimaryAction}
                canReverseSelectedRun={canReverseSelectedRun}
                reverseReason={reverseReason}
                setReverseReason={setReverseReason}
                handleReverseRun={handleReverseRun}
              />
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
